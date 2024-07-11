# README

Caveat Emptor. Beware all ye who enter here, there be dragons of instability.

I make no guarantees at this point that any part of this will remain stable, including and especially the external interfaces. I don't even guarantee that this README will stay up to date with changes.

Currently src/ contains a library folder and an implementation folder, seperating out the implementation of business logic from the framework I've built to tie the various tooling together. The library folder may eventually be broken out into a seperate package and then submoduled in or pulled in as an npm package but for now this provides enough conceptual space between the two.

The design of the system as it stands makes a few assumptions which may eventually be matters of configuration. It assumes that you're going to use B2 for object storage, redis (in memory or on disk) for databases, firebase for authentication with an option for self-signed jwts (for development and testing), firebase for sending mobile notifications, and apple pay and google pay for payment processing. There may be other hidden assumptions but if so I haven't rooted them out just yet. Somewhat obviously it also assumes that you're trying to build an event sourced system for some kind of business which will be accessible to clients via a graphql server, as that's what the whole thing... does... is...

The system also assumes that there are two redis databases at its disposal, one for events and one for cached state in various forms. This is enforced in library/api/server.js

At present none of the keys overlap so it would be possible to use two connections to one database for this but this mode of operation is NOT SUPPORTED, I make no guarantees that I won't use the same key structure in both places. I know I could namespace the keys to prevent that from ever happening but I don't want to.

The context generator called by the gql server assumes that there is a 'user' agent type and that it is the "default" type, and that there is a 'superuser' type. This is currently an unenforced convention. It really ought to be enforced but it definitely isn't unless I did that and forgot about it already.

By convention if reading an aggregate from a stream returns a top-level field called profile in the resulting object, the object listed under that profile label contains public information which can be exposed to anyone who knows how to ask for it.

Library/utils/read contains methods for reading entire aggregates from either a raw event stream or a database, reading profiles from the database, reading chat messages from the database as well as wrappers for the exists and some other redis driver methods. I may eventually make the database backend configurable so that we can use redis for caching and something more reliable for long term persistence where absolute maximum performance is less important.

Currently the system assumes that contact handling and messaging are part of the overarching framework, and also that they don't need to be particularly configurable in a specific implementation. This area is even less stable than the system in general. I haven't decided how I want to handle about 90% of the corner and edge cases I've thought of so far, nor any (obviously) of the cases that I haven't thought of.

Config files currently assume the structure as it is, not as it may end up as per the first paragraph of this readme... Which is to say that you have to... have a library and implementation directory in src/.. That type of thing. Okay, so this isn't great documentation. It's the thought that counts. I think this paragraph of the README (the one you're reading now) may already be outdated actually.
