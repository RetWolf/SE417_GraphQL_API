const bcrypt = require('bcrypt');

const saltRounds = 10;

const knex = require('knex')({
  client: process.env.DB_CONNECTOR,
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_PRIMARY_DB,
  },
});

const resolvers = {
  BaseResponse: {
    __resolveType: (response) => {
      if (response.users) return 'ManyUsersResponse';
      if (response.user) return 'OneUserResponse';
      if (response.loggedIn) return 'AuthResponse';
      return null;
    },
  },
  Query: {
    getAllUsers: async () => {
      const allUsers = await knex.select().from('users');
      return {
        statusCode: 200,
        message: `Successfully found ${allUsers.length} users.`,
        users: allUsers,
      };
    },
    getUser: async (_, { userid }) => {
      const [user] = await knex('users').where('userid', userid);
      return {
        statusCode: 200,
        message: `Successfully found user with ID: ${userid}.`,
        user,
      };
    },
  },
  Mutation: {
    createUser: async (_, { user }) => {
      const localUser = user;
      localUser.pass = await bcrypt.hash(localUser.pass, saltRounds);
      const [createdUser] = await knex('users').returning(['userid', 'firstname', 'lastname', 'email']).insert(localUser);
      return {
        statusCode: 200,
        message: `Successfully created user with ID: ${createdUser.userid}.`,
        user: createdUser,
      };
    },
    deleteUser: async (_, { userid }) => {
      const [deletedUser] = await knex('users').returning(['userid', 'firstname', 'lastname', 'email']).where('userid', userid).del();
      return {
        statusCode: 200,
        message: `Successfully deleted user with ID: ${deletedUser.userid}.`,
        user: deletedUser,
      };
    },
    loginUser: async (_, { email, pass }) => {
      const [foundUser] = await knex('users').column('pass').where('email', email);
      if (await bcrypt.compare(pass, foundUser.pass)) {
        return {
          statusCode: 200,
          message: 'Successfully logged in!',
          loggedIn: true,
        };
      }
      return {
        statusCode: 401,
        message: 'Incorrect credentials, please try again.',
        loggedIn: false,
      };
    },
  },
};

module.exports = { resolvers };
