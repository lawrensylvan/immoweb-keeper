import React from 'react'
import { Route } from 'react-router-dom'
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import SearchPage from './SearchPage'
import '../styles.css'

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

        <Route exact path='/'>
          <SearchPage />
        </Route>
    </ApolloProvider>
  )
}

export default App