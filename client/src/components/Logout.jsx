
import { useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import { useEffect } from 'react'

export default function Logout() {

    const apolloClient = useApolloClient()
    const navigateTo = useNavigate()

    useEffect(() => {
        logout()
    })

    async function logout() {
        localStorage.removeItem('token', null)
        await apolloClient.clearStore()
        navigateTo('/login')
    }

    return null
}