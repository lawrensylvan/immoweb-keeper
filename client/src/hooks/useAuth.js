import jwt from 'jsonwebtoken'
import { useState } from 'react'

function decode(token) {
    if(token && token !== 'null' && token !== 'undefined') {
        const decoded = jwt.decode(token)
        if(decoded) { 
            return decoded.user.name
        }
    } else {
        return null
    }
}

export default function useAuth() {

    const [{token, userName}, setToken] = useState(() => {
        const token = localStorage.getItem('token')
        const userName = decode(token)
        return {token, userName}
    })
    
    const updateToken = (token) => {
        localStorage.setItem('token', token)
        setToken({token, userName: decode(token)})
    }

    return [{token, userName}, updateToken]
}