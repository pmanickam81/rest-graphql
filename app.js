const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const Event = require('./model/event');
const bcrypt = require('bcrypt');
app.use(bodyParser.json());

app.use(
    '/graphql',
    graphqlHttp({
        schema: buildSchema(`
        type Event{
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }
        
        type User{
            _id: ID!
            email: String!
            password: String
        }
        
        input EventInput{
            title: String!
            description: String!
            price: Float!
            date: String!
        }
        
        input UserInput{
            email: String!
            password: String!
        }
        
        type RootQuery {
            events: [Event!]!
        }
        
        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }
        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
        rootValue: {
            events: () => {
                return Event.find()
                    .then(events => {
                        return events.map(event => {
                            return { ...event._doc };
                        });
                    })
                    .catch(err => {
                        console.log(err);
                    });
            },
            createEvent: (args) => {
                const event = new Event({
                    title: args.eventInput.title,
                    description: args.eventInput.description,
                    price: +args.eventInput.price,
                    date: new Date(args.eventInput.date)
                });
                return event.save()
                    .then(result => {
                        console.log(result);
                        return { ...result._doc };
                    })
                    .catch(err => {
                        console.log(err);
                        throw err;
                    });
            },
            createUser: args => {
                return bcrypt.hash(args.userInput.password, 12)
                    .then(hashPassword => {
                        const user = new User({
                            email: args.userInput.email,
                            password: hashPassword
                        });
                        return user.save();
                    })
                    .then(result => {
                        return { ...result._doc, _id: result.id };
                    })
                    .catch(err => {
                        console.log(err);
                        throw err
                    });

            }
        },
        graphiql: true
    })
);


mongoose.connect("mongodb+srv://root:" + process.env.MONGO_PASSWORD + "@demo-cluster-1-9mdui.mongodb.net/" + process.env.MONGO_DB + "?retryWrites=true&w=majority", { useNewUrlParser: true })
    .then(() => {
        app.listen(3000);
    })
    .catch((err) => {
        console.log(err);
    });

