const express = require('express')
const cors = require('cors')

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.post('/api/process', async (req, res) => {
  const input = req.body.input;
  const processedString = processString(input);

  res.status(201).json({ result: processedString });
});

app.get('/', async (req, res) => {
  res.status(200).json({ hello: "Hello, world!" });
})

app.listen(port, () => {
  console.log('Server is running on http://localhost:3000');
});

function processString(str) {
  const regex = /0x[0-9a-fA-F]+/g;

  return str.replace(regex, '"$&"');
}
