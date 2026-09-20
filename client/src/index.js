import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'

if (process.env.NODE_ENV === 'development') {
    document.title = 'Immoweb Keeper - DEV'
}

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
)
