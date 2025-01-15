const { error } = require("winston");
const AIbitat = require("../../index.js");
const { cli } = require("../../plugins/cli.js");
require("dotenv").config({ path: `../../../../../.env.development` });

const axios = require('axios');


const Agent = {
  HUMAN:     "Human",
  ListFetcherAI: "List Fetcher",
  SingleFetcherAI: "Single Fetcher",
  TodoerAI:  "Todoer",
  EvaluatorAI: "Evaluator"
};



const aibitat = new AIbitat({
  provider: "openai",
  model: "gpt-4o",
})
  .use(cli.plugin({simulateStream: false}))

  .function({
    name: "fetch-inbox",
    description: "Fetches recent emails from Gmail.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "The email address to fetch inbox from" },
      },
      required: ["address"],
    },
    handler: async ({ address }) => {
      try {
        console.log("1 FI");
        const response = await axios.get(
          `http://localhost:8000/api/mail/list/${address}`
        );
        console.log("2 FI");

        // make sure the response contains the expected format
        if (!response.data || !response.data.threads) {
          return {
            content: "No emails found in the inbox.",
          };
        }
        console.log("3 FI");
        // Extract thread summaries
        const threads = response.data.threads.map((thread, index) =>
          `ID ${index}: ${thread.id}`
        );

        console.log(threads);

        // make sure content is a string, not an object or array
        return threads.length > 0 ? threads.join("\n\n") : "No recent emails found.";
      } catch (error) {
        console.error("Error fetching inbox:", error.message);
        return {
          content: "Failed to fetch emails due to an error.",
        };
      }
    },
  })

  .function({
    name: "fetch-single-email",
    description: "Fetches a single email by ID from a specific email inbox.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "The id to fetch an email by" },
        address: { type: "string", description: "The inbox address to fetch the email from" },
      },
      required: ["id", "address"],
    },
    handler: async ({ address, id }) => {
      try {
        console.log(`1 SE: Address: ${address}, id: ${id}`);
        const response = await axios.get(
          `http://localhost:8000/api/mail/read/${address}/${id}`
        );
        console.log("2 SE");

        // console.log(response);
        // make sure the response contains the expected format
        if (!response.data) {
          return {
            content: "Email wasn't found in the inbox.",
          };
        }

        const payload = response.data.payload;

        if (payload.parts) {
          // Multipart email: Prioritize "text/plain", fallback to "text/html"
          const textPart = payload.parts.find(part => part.mimeType === "text/plain");
          const htmlPart = payload.parts.find(part => part.mimeType === "text/html");

          base64Content = textPart?.body.data || htmlPart?.body.data;
        } else if (payload.mimeType === "text/plain" || payload.mimeType === "text/html") {
          // Single-part email: Directly use available content
          base64Content = payload.body.data;
        }
        else {
          throw (error("email has no plain text part"));
        }

        const emailContent = decodeBase64Url(base64Content);
        console.log(emailContent);

        console.log("3 SE");
        return `Content for ID ${id} is ${emailContent}`;
      } catch (error) {
        console.error("Error fetching single email:", error.message);
        return "Failed to fetch emails due to an error :${error.message}.";
      }
    },
  })
  .agent(Agent.HUMAN, {
    interrupt: "ALWAYS",
    role: `You are a human assistant interacting with the AI agents. 
    - You provide search queries to find relevant emails.
    - You review email content when requested and clarify queries if necessary.
    - You confirm when no more queries need to be answered.
    - You finalize the process by confirming the generated to-do list.`
  })
  
  .agent(Agent.ListFetcherAI, {
    functions: ["fetch-inbox"],
    role: `You fetch email IDs from the Gmail API.
    - Your only task is to retrieve a list of email IDs from the inbox.
    - You do not process or analyze the content of the emails.
    - You provide the list of IDs to the conversation when requested.
    - You do not fetch the same list twice unless explicitly asked.`
  })
  
  .agent(Agent.SingleFetcherAI, {
    functions: ["fetch-single-email"],
    role: `You retrieve the content of emails based on their ID.
    - You fetch email content one by one from the list provided by @ListFetcherAI, the IDs are a sequence of character usually beginning with 193.
    - You provide the email content verbatim, enclosed in "quotes," along with the email ID.
    - You ensure that each email ID is only checked once.
    - If @EvaluatorAI requests another email, you fetch the next one in the list.
    - You do not analyze or process the email; you only retrieve and display it.`
  })
  
  .agent(Agent.EvaluatorAI, {
    role: `You evaluate whether an email sufficiently answers the human's query.
    - When @SingleFetcherAI provides an email, check if it answers the query.
    - If the email is relevant but lacks detail, ask @HUMAN for clarification or refinement.
    - If the email fully answers the query, ask @HUMAN if they have another query.
    - If the email does not answer the query, request @SingleFetcherAI to fetch another email.
    - Consider different languages, as emails may not be in English.
    - When @HUMAN confirms that there are no more queries, instruct @TodoerAI to generate a to-do list of selected emails.`
  })
  
  .agent(Agent.TodoerAI, {
    role: `You create a to-do list based on the emails approved by @EvaluatorAI.
    - You gather all relevant emails that were deemed useful.
    - You generate a structured to-do list in markdown format.
    - The list should be clear and organized, containing necessary details from each email.
    - Once complete, provide the to-do list for @HUMAN to review and confirm.`
  })
  // .agent(Agent.HUMAN, {
  //   interrupt: "ALWAYS",
  //   role: "You are a human assistant.",
  // })
  // .agent(Agent.ListFetcherAI, {
  //   functions: ["fetch-inbox"],
  //   role: "You are a helpful assitant that fetches emails from gmail api. The only thing you do is fetch the email ids and provide them to the conversation."
  // })
  // .agent(Agent.SingleFetcherAI, {
  //   functions: ["fetch-single-email"],
  //   role: "You are a helpful AI assistant that gets email content using email ids. You remember to fetch emails one by one using the list of ids provided by @fetcher, and you give email content verbatim inside \"quotes\" together with id to eveluator for evaluation. The evaluator may ask to get another email, so you will get the next one on the previosuly mentioned list. You will check each email id only once."
  // })
  // .agent(Agent.EvaluatorAI, {
  //   role: "You are a helpful AI assistant that evaluates querries by @human against emails found by @todoer. Whenever @todoer provides content of an email, you check whether it sufficiently answers the querry. If the email may answer the querry, but there is insufficient detail, you ask @human to provide feedback. In the case that email answers the querry, you ask human for another querry. If the email doesn't answer the querry, you ask todoer to get another different email for evaluation. Remember to check other languages as well, the email may not be in english. Whenever human says that there are no more querries, you ask the @todoer to generate a todo list containing the selected emails."
  // })
  // .agent(Agent.TodoerAI, {
  //   role: "You are a todo list generator. You take emails approved by @evaluatorai, and put them into a todo list. You generate a markdown file that contains the list."
  // })
  .channel("Email todo list", [
    Agent.HUMAN,
    Agent.SingleFetcherAI,
    Agent.ListFetcherAI,
    Agent.TodoerAI,
    Agent.EvaluatorAI
  ]);

async function main() {
  if (!process.env.OPEN_AI_KEY)
    throw new Error(
      "This example requires a valid OPEN_AI_KEY in the env.development file"
    );
  await aibitat.start({
    from: Agent.HUMAN,
    to: "Email todo list",
    content: "Hello! Please fetch my emails! Im n.dziaugys@gmail.com. Make a todo list of my recent 10 emails but only include the ones with specific dates.",
  });
}

function decodeBase64Url(encodedStr) {
  // Convert Base64 URL format to standard Base64 format
  const base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');

  // Decode the Base64 string
  const decodedContent = decodeURIComponent(atob(base64).split('').map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  const cleanedUpContent = cleanText(decodedContent);
  return cleanedUpContent;
}

function cleanText(input) {
  return input
      .replace(/[\r\n]+/g, '\n')  // Normalize newlines to single \n
      .replace(/&amp;/g, '&')      // Decode HTML entities
      .replace(/\u00a0/g, ' ')     // Replace non-breaking spaces with normal spaces
      .replace(/\s{2,}/g, ' ')     // Collapse multiple spaces/tabs into one
      .trim();                     // Trim leading/trailing spaces/newlines
}

main();
