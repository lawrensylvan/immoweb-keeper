import React from 'react'
import { ApolloClient, ApolloProvider, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import MainLayout from './MainLayout'
import LoginScreen from './LoginScreen'
import SearchPage from './SearchPage'
import LikedEstates from './LikedEstates'
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import '../styles.css'
import Logout from './Logout'

const httpLink = createHttpLink({
    uri: `http://localhost:${process.env.REACT_APP_PORT || 5000}/graphql`
})

const authLink = setContext((_, { headers }) => ({
    headers: {
        ...headers,
        authentication: localStorage.getItem('token')
    }
}))

const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
        typePolicies: {
            Estate: {
                keyFields: ['immowebCode']
            }
        }
    })
})

function PrivateOutlet() {
    const token = localStorage.getItem('token')
    const isAuthenticated = token && token !== 'null' && token !== 'undefined'
    return isAuthenticated ? <Outlet/> : <Navigate to="/login" />
}

export default function App() {

    return (
        <ApolloProvider client={client}>
            <BrowserRouter>
                <Routes>

                    <Route path="login" element={<LoginScreen/>}/>
                    
                    <Route path="logout" element={<Logout/>}/>

                    <Route path="/" element={<PrivateOutlet/>}>
                        <Route element={<MainLayout/>}>
                            <Route path="explore" index element={<SearchPage/>} />
                            <Route path="liked-estates" element={<LikedEstates/>} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/explore"/>}/>

                </Routes>
            </BrowserRouter>
        </ApolloProvider>
    )

}