const functions = require("firebase-functions");
const line = require("@line/bot-sdk");
const express = require("express");
const firebase = require("firebase-admin");
const { WebhookClient } = require("dialogflow-fulfillment");

firebase.initializeApp({});

const {
  postToDialogflow,
  createLineTextEvent,
  convertToDialogflow,
} = require("./dialogflow");

const config = {
  channelAccessToken: functions.config().line.channel_access_token,
  channelSecret: functions.config().line.channel_secret,
};
const app = express();

app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(
    req.body.events.map((event) => {
      return handleEvent(req, event);
    })
  );
});

app.use(express.json({ limit: "50mb" }));
app.post("/fulfillment", (request, response) => {
  const agent = new WebhookClient({ request, response });
  let intentMap = new Map();
  intentMap.set("register - date", handleFulfillment);
  agent.handleRequest(intentMap);
});

async function handleEvent(req, event) {
  switch (event.type) {
    case "message":
      switch (event.message.type) {
        case "text":
          return handleText(req, event);
        case "location":
          return handleLocation(req, event);
      }
    case "postback":
      return handlePostback(req, event);
    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}

async function handleText(req) {
  return await postToDialogflow(req);
}

function handleLocation(req, event) {
  const message = event.message;
  const newEvent = createLineTextEvent(
    req,
    event,
    `LAT : ${message.latitude}, LNG : ${message.longitude}`
  );
  convertToDialogflow(req, newEvent);
}

function handlePostback(req, event) {
  //event.postback = { data: 'selected_date', params: { date: '2021-08-15' } }
  const { date } = event.postback.params;

  // TODO
  const newEvent = createLineTextEvent(req, event, `DATE: ${date}`);
  convertToDialogflow(req, newEvent);
}

async function handleFulfillment(agent) {
  const userId = agent.originalRequest.payload.data.source.userId;
  const { name, latitude, longitude, selected_date } = agent.parameters;
  const doc = {
    uid: userId,
    name,
    latitude,
    longitude,
    selected_date: Date.parse(selected_date),
  };
  await firebase.firestore().collection("member").doc(userId).set(doc);
  agent.add("บันทึกข้อมูลสำเร็จแล้ว");
}

exports.api = functions.region("asia-northeast1").https.onRequest(app);
