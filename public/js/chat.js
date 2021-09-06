const socket = io() // This allow us to send events and receive events for both, the server and the client. Your client-side JavaScript can then connect to the Socket.io server by calling io. io is provided by the client-side Socket.io library. Calling this function will set up the connection, and it’ll cause the server’s connection event handler to run.

//Elements
const $messageForm = document.querySelector('#message-form') // "$" is used in convention to specify that this variable is selecting elements of the DOM
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true }) //Qs.parse() from Library loaded in javascript, is going to create a object with two properties, one is username property with value "Oscar" and the other is room property with value "South". "location.search" is going to fetch the query from the url ("?username=Oscar&room=South"). "ignoreQueryPrefix: true " is an option to ignore the "?" mark from the query fetched

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeigh = $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeigh - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('message', (message) => { // receiving the event 'message' that the server is sending to us (the client)
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a') //moment is a library loaded in "index.html" // https://momentjs.com/docs/#/displaying/
    }) //Mustache is the library loaded in "index.html" document
    $messages.insertAdjacentHTML('beforeend', html) // allow us to insert other HTML adjacent to the element we've selected ($messages)
    autoscroll()
})

socket.on('locationMessage', (message) => {
    console.log(message)
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

//Sending Message
$messageForm.addEventListener('submit', (e) => {
    e.preventDefault() // to prevent that default behavior where the browser goes through a full page refresh.

    $messageFormButton.setAttribute('disable', 'disable') // (atribut name, action name), this disable the button "send" to prevent send multiple o repetitive message until is enable again

    const message = e.target.elements.message.value // Grabbing value from name="message" in index.html input

    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disable') //enables the button Send, so, after a few seconds you can send message again. This is done to avoid repetitive messages when the client click error by mistake
        $messageFormInput.value = '' // Clearing input
        $messageFormInput.focus() //Moving the cursos into the input
        

        if (error) {
            return console.log(error)
        }

        console.log('Message delivered')
    })
})

//Sharing Location - https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) { //Old navigators does not support "navigator.geolocation"
        return alert('Geolocation is not supported by your browser')
    }

    $sendLocationButton.setAttribute('disable', 'disable')

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {            
            $sendLocationButton.removeAttribute('disable')
            console.log('Location shared!')
        })

    })
})

socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error)
        location.href = '/' //redirect to the route of the site, this is the join page: "localhost:3000/"
    }
}) // emiting variables from "//Options"