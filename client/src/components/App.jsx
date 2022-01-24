import React from 'react'
import { ApolloProvider } from '@apollo/client'
import MainLayout from './MainLayout'
import LoginScreen from './LoginScreen'
import SearchPage from './SearchPage'
import LikedEstates from './LikedEstates'
import VisitedEstates from './VisitedEstates'
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import '../styles.css'
import Logout from './Logout'
import useAuth from '../hooks/useAuth'
import { apolloClient } from '../apollo/config'

const DEFAULT_PAGE = '/explore/advanced-search'

export default function App() {

    const [{token, userName}, setToken] = useAuth()

    return (
        <ApolloProvider client={apolloClient}>
            <BrowserRouter>
                <Routes>

                    <Route path="login" element={<LoginScreen setToken={setToken} />}/>
                    
                    <Route path="logout" element={<Logout/>}/>

                    <Route path="/" element={token ? <Outlet/> : <Navigate to="/login" />}>
                        <Route element={<MainLayout userName={userName}/>}>
                            <Route path="explore/advanced-search" element={<SearchPage/>} />
                            <Route path="flagged-items/liked-estates" element={<LikedEstates/>} />
                            <Route path="flagged-items/visited-estates" element={<VisitedEstates/>} />
                            <Route path="" element={<Navigate to={DEFAULT_PAGE} />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to={DEFAULT_PAGE} />}/>

                </Routes>
            </BrowserRouter>
        </ApolloProvider>
    )

}