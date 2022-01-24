import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import _ from 'lodash'

// Graphql main Endpoint
const httpLink = createHttpLink({
    uri: `/graphql`
})

// Include logged in user token in request header
const authLink = setContext((_, { headers }) => ({
    headers: {
        ...headers,
        authentication: localStorage.getItem('token')
    }
}))

export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
        typePolicies: {
            Query: {
                fields: {
                    estates: {
                        // Configure cache for offset-based pagination
                        keyArgs: (args) => Object.keys(_.omit(args, ['limit', 'offset'])),
                        merge(existing, incoming) {
                            if(!incoming) return existing
                            if(!existing) return incoming
                            const {page, ...rest} = incoming
                            return {
                                page: [...existing.page, ...page],
                                ...rest
                            }
                        }
                    }
                }
            },
            
            // Identify immowebCode as the unique key for estates
            Estate: {
                keyFields: ['immowebCode']
            }
        }
    })
})
