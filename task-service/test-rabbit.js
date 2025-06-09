// test-rabbit.js
const amqp = require("amqplib");
amqp.connect("amqp://localhost").then(conn => {
  console.log("Connected to RabbitMQ");
  conn.close();
}).catch(console.error);