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
                        
                        merge(existing, incoming, { args }) {
                            console.log('EXISTING')
                            console.dir(existing)
                            console.log('INCOMING')
                            console.dir(incoming)
                            console.log('ARGS')
                            console.dir(args)

                            const merged = existing ? existing.page.slice(0) : []
                            const end = args.offset + Math.min(args.limit, incoming.page?.length)
                            for (let i = args.offset; i < end; ++i) {
                                merged[i] = incoming.page[i - args.offset]
                            }

                            return {
                                page: merged,
                                totalCount: incoming.totalCount
                            }
                        }

                        /*merge(existing, incoming) {
                            if(!incoming) return existing
                            if(!existing) return incoming
                            const {page, ...rest} = incoming
                            console.dir(page)
                            return {
                                page: _.uniqBy([...existing.page, ...page]/*, e => e.__ref/, // uncomment = workaround for bug of duplicate rows in table results components
                                ...rest
                            }
                        }*/

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
