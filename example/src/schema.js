import { makeExecutableSchema } from 'graphql-tools'
import { gql } from 'apollo-server'

// This is a (sample) collection of books we'll be able to query
// the GraphQL server for.  A more complete example might fetch
// from an existing data source like a REST API or database.
const text = 'lorem ipsum '.repeat(Math.round(100 * 1000 / 12))
const books = [
  {
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J.K. Rowling',
    text,
  },
  {
    title: 'Jurassic Park',
    author: 'Michael Crichton',
    text,
  },
]

// Type definitions define the "shape" of your data and specify
// which ways the data can be fetched from the GraphQL server.
const typeDefs = gql`
  # Comments in GraphQL are defined with the hash (#) symbol.

  # This "Book" type can be used in other type declarations.
  type Book {
    title: String!
    author: String!
    text: String!
  }

  # The "Query" type is the root of all GraphQL queries.
  # (A "Mutation" type will be covered later on.)
  type Query {
    books: [Book]
  }
`

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
  Query: {
    books: () => books,
  },
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

export default schema
