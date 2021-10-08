import React from 'react'
import { Route } from 'react-router-dom'
import { Explorer } from './Explorer'
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache()
})

const App = () => {
  return (
    <ApolloProvider client={client}>
      <Route exact path='/'>
        <Explorer />
      </Route>
    </ApolloProvider>
  )
}

export default App