db = db.getSiblingDB('coffee_bot')

db.createUser({
  user: 'coffee_bot',
  pwd: 'ec0848e6-7245-4a89-bdc3-b072f2600ef9',
  roles: [
    {
      role: 'readWrite',
      db: 'coffee_bot',
    },
  ],
})