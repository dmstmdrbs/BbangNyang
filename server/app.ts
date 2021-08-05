import { resolveSoa } from 'dns/promises';

require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const http = require('http');
const socketio = require('socket.io');

const indexRouter = require('./router/index');
app.use(indexRouter);

const corsOptions = {
  cors: true,
  origins: [process.env.CLIENT || 'http://localhost:3000'],
};
app.use(cors());

const server = http.createServer(app);
const io = socketio(server, corsOptions);

const { roomCodeGenerator } = require('./game/roomCodeGenerator.ts');
const { addUser, removeUser, getUser, getUsersInRoom, checkRoom } = require('./socket/users.tsx');
const {generateName} = require('./game/nameGenerator');

io.on('connect', (socket: any) => {
  socket.on('join', ({ name , room }: any, callback: any) => {
    console.log(`join user : ${name}, room : ${room}`);
    const { error, user } = addUser({ id: socket.id, name, room });
    if (error) return callback(error);

    socket.join(user.room);

    socket.emit('message', {
      user: 'admin',
      text: `${user.name}, welcome to room ${user.room}.`,
    });
    socket.broadcast
      .to(user.room)
      .emit('message', { user: 'admin', text: `${user.name} has joined!` });

    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on('sendMessage', (message: any, callback: any) => {
    const user = getUser(socket.id);
    //모든 사용자에게 메시지 전달
    io.to(user.room).emit('message', { user: user.name, text: message });

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    console.log(`${socket.id} has left`);
    if (user) {
      io.to(user.room).emit('message', {
        user: 'Admin',
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

app.get('/makeRoom', (req: any, res: any) => {
  res.send({code:roomCodeGenerator(),name:generateName()});
});

app.get('/getName', (req:any,res:any)=>{
  res.send({name:generateName()});
})
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`listening on port : ${port}`);
});

// app.listen(port, () => console.log(`listening on port ${port}`));
