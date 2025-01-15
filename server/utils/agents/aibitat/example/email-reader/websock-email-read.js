// You can only run this example from within the websocket/ directory.
// NODE_ENV=development node websock-multi-turn-chat.js
// Scraping is enabled, but search requires AGENT_GSE_* keys.

const express = require("express");
const chalk = require("chalk");
const AIbitat = require("../../index.js");
const {
  websocket,
  webBrowsing,
  webScraping,
} = require("../../plugins/index.js");
const path = require("path");
const port = 3000;
const app = express();
require("@mintplex-labs/express-ws").default(app); // load WebSockets in non-SSL mode.
require("dotenv").config({ path: `../../../../../.env.development` });

const controllers = require('./controllers');

// Debugging echo function if this is working for you.
// app.ws('/echo', function (ws, req) {
//   ws.on('message', function (msg) {
//     ws.send(msg);
//   });
// });

// Set up WSS sockets for listening.
app.ws("/ws", function (ws, _response) {
  try {
    ws.on("message", function (msg) {
      if (ws?.handleFeedback) ws.handleFeedback(msg);
    });

    ws.on("close", function () {
      console.log("Socket killed");
      return;
    });

    console.log("Socket online and waiting...");
    runAIbitat(ws).catch((error) => {
      ws.send(
        JSON.stringify({
          from: Agent.AI,
          to: Agent.HUMAN,
          content: error.message,
        })
      );
    });
  } catch (error) {}
});

app.all("*", function (_, response) {
  response.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Testing HTTP/WSS server listening at http://localhost:${port}`);
});

const Agent = {
  HUMAN: "🧑",
  AI: "🤖",
};

async function runAIbitat(socket) {
  if (!process.env.OPEN_AI_KEY)
    throw new Error(
      "This example requires a valid OPEN_AI_KEY in the env.development file"
    );
  console.log(chalk.blue("Booting AIbitat class & starting agent(s), preping Gmail API"));
  const aibitat = new AIbitat({
    provider: "openai",
    model: "gpt-4o-mini",
  })
    .use(websocket.plugin({ socket }))
    .use(webBrowsing.plugin())
    .use(webScraping.plugin())
    .function({
      name: "fetch-emails",
        description: "Fetch the latest emails from the user's Gmail account.",
        parameters: {
            type: "object",
            properties: {
                email: {
                    type: "string",
                    description: "The user's Gmail address",
                },
            },
            required: ["email"],
        },
        handler: async ({ email }) => {
          if (!email) {
              return "Error: No email provided. Please specify an email address.";
          }
  
          try {
              const emails = await controllers.getMails(email);
              return `Here are your latest emails: ${JSON.stringify(emails)}`;
          } catch (error) {
              console.error("Error fetching emails:", error);
              return "An error occurred while fetching emails.";
          }
      },
    })
    .agent(Agent.HUMAN, {
      interrupt: "ALWAYS",
      role: "You are a human assistant intereseted in evolution of swearwords.",
    })
    .agent(Agent.AI, {
      role: "You are a helpful AI assistant that can fetch emails from Gmail.",
      functions: ["fetch-emails"],
    });

  await aibitat.start({
    from: Agent.HUMAN,
    to: Agent.AI,
    content: `Please fetch me my emails, im n.dziaugys@gmail.com`,
  });
}
