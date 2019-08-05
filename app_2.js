const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const Event = require('./model/event');
const User = require('./model/user');
const bcrypt = require('bcryptjs');

const app = express();

app.use(bodyParser.json());

app.use('/graphql', graphqlHttp({
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
        events: async () => {
            try {
                const events = await Event.find();
                return events.map(event => {
                    console.log("Querying Event -->" + event);
                    return { ...event._doc };
                });
            }
            catch (err) {
                console.log(err);
                throw err;
            }
        },
        createEvent: async args => {
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: new Date(args.eventInput.date),
                createdBy: '5d42da7ae5a49c34fcab4b43'
            });
            try {
                const result = await event.save();
                console.log("After Saving the event -->" + result);
                const eventCreatedUser = await User.findById('5d42da7ae5a49c34fcab4b43');
                let createdEvent = { ...event._doc };
                if (!eventCreatedUser) {
                    throw new Error('User not found!');
                }
                eventCreatedUser.createdEvents.push(event);
                await eventCreatedUser.save()
                return createdEvent
            }
            catch (err) {
                console.log(err);
                throw err;
            }
        },
        createUser: async args => {
            try {
                const checkUser = await User.findOne({ email: args.userInput.email });
                if (checkUser) {
                    throw new Error('User already exists');
                }
                const hashedPassword = await bcrypt.hash(args.userInput.password, 10);
                const user = new User({
                    email: args.userInput.email,
                    password: hashedPassword
                });
                const result = await user.save();
                console.log("User Result --> " + result);
                return { ...result._doc, password: null };
            }
            catch (err) {
                console.log(err);
                throw err;
            }
        }
    },
    graphiql: true
}));

mongoose.connect("mongodb+srv://" + process.env.MONGO_USER + ":" + process.env.MONGO_PASSWORD + "@demo-xl7bq.mongodb.net/" + process.env.MONGO_DB + "?retryWrites=true&w=majority", { useNewUrlParser: true })
    .then(() => {
        app.listen(3000);
    }).catch(err => {
        console.log(err)
    });

