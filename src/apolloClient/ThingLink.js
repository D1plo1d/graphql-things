"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_link_1 = require("apollo-link");
const client_1 = require("./client");
class ThingLink extends apollo_link_1.ApolloLink {
    constructor({ createConnection, options, }) {
        super();
        this.client = new client_1.Client(createConnection, options);
    }
    request(operation) {
        return this.client.request(operation);
    }
}
exports.ThingLink = ThingLink;
//# sourceMappingURL=ThingLink.js.map