import React from 'react'
import { Route } from 'react-router-dom'
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import SearchPage from './SearchPage'
import '../styles.css'

const client = new ApolloClient({
  uri: `http://localhost:${process.env.REACT_APP_PORT || 5000}/graphql`,
  cache: new InMemoryCache()
})

const App = () => {
  return (
    <ApolloProvider client={client}> 
        <Route exact path='/'>
          <SearchPage />
        </Route>
    </ApolloProvider>
  )
}

export default App