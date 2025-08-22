const express = require('express');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let pluginOn = false;

app.get('/login', (req, res) => {
  res.send(`<form method="post" action="/login">
    <input name="user" placeholder="user"/>
    <input name="pass" placeholder="pass" type="password"/>
    <button type="submit">Login</button>
  </form>`);
});

app.post('/login', (req, res) => { res.redirect('/dashboard'); });

app.get('/dashboard', (req, res) => {
  res.send(`<h1>Dashboard</h1>
    <p id="status">Plugin A: ${pluginOn ? 'ON' : 'OFF'}</p>
    <form method="post" action="/toggle"><button type="submit">Toggle</button></form>`);
});

app.post('/toggle', (req, res) => { pluginOn = !pluginOn; res.redirect('/dashboard'); });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('App listening on ' + port));

