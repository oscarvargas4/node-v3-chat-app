const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname,  '../public')

app.use(express.static(publicDirectoryPath))

//server (emit) -> client (receive) - message (event)
//client(emit) -> server (receive) - sendMessage (event)

io.on('connection', (socket) => { // 'connection' is the name of the event that triggers the function (callback)
    console.log('New WebSocket connection')
    
    socket.on('join', ( options, callback) => { // "options" is the object: {username, room}
        const { error, user } = addUser({ id: socket.id, ...options}) //"..." spread operator to spread along the other properties {username, room}

        if (error) {
            return callback(error)
        }

        socket.join(user.room) //Allows us to join a given chat room and we pass the name's room we are trying to join

        socket.emit('message', generateMessage('Admin', 'Welcome!')) 
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room),
        })


        callback()

    })

    socket.on('sendMessage', (message, callback) => { //listening from client the event 'sendMessage'. callback is for event acknowledgement
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is no allowed')
        }
        
        io.to(user.room).emit('message', generateMessage(user.username, message))  // will emit to a every single connection available
        callback()
    })

    //Location
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    
    //When user disconnects
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

        
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})