import prisma from './index';

async function main() {
  // Clear existing data
  await prisma.collectionUser.deleteMany({});
  await prisma.collectionMedia.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.media.deleteMany({});
  await prisma.user.deleteMany({});

  // Create users
  const user1 = await prisma.user.create({
    data: {
      id: "user1",
      name: "John Doe",
      username: "john_doe",
      email: "john@example.com",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      id: "user2",
      name: "Jane Smith",
      username: "jane_smith",
      email: "jane@example.com",
    },
  });

  // Create media
  const media1 = await prisma.media.create({
    data: {
      title: "Inception",
      description: "A mind-bending sci-fi thriller",
      type: "FILM",
      releaseDate: new Date("2010-07-16"),
      directorAuthor: "Christopher Nolan",
      tags: ["sci-fi", "thriller", "mind-bending"],
      platforms: ["Netflix", "Amazon Prime"],
      scores: { imdb: 8.8, metacritic: 74 },
    },
  });

  const media2 = await prisma.media.create({
    data: {
      title: "Breaking Bad",
      description: "A chemistry teacher turned drug lord",
      type: "SERIES",
      releaseDate: new Date("2008-01-20"),
      directorAuthor: "Vince Gilligan",
      tags: ["crime", "drama", "psychological"],
      platforms: ["Netflix"],
      scores: { imdb: 9.5 },
    },
  });

  const media3 = await prisma.media.create({
    data: {
      title: "The Hobbit",
      description: "A fantasy novel about a hobbit's adventure",
      type: "BOOK",
      releaseDate: new Date("1937-09-21"),
      directorAuthor: "J.R.R. Tolkien",
      tags: ["fantasy", "adventure", "classic"],
      platforms: [],
      scores: { goodreads: 4.3 },
    },
  });

  // Create collections
  const collection1 = await prisma.collection.create({
    data: {
      name: "Sci-Fi Classics",
      description: "Must-watch science fiction films",
      visibility: "PUBLIC",
      tags: ["sci-fi", "classic"],
      ownerId: user1.id,
    },
  });

  const collection2 = await prisma.collection.create({
    data: {
      name: "To Watch",
      description: "My watchlist",
      visibility: "PRIVATE",
      tags: ["watchlist"],
      ownerId: user1.id,
    },
  });

  // Add media to collections
  await prisma.collectionMedia.create({
    data: {
      collectionId: collection1.id,
      mediaId: media1.id,
      position: 1,
    },
  });

  await prisma.collectionMedia.create({
    data: {
      collectionId: collection2.id,
      mediaId: media2.id,
      position: 1,
    },
  });

  await prisma.collectionMedia.create({
    data: {
      collectionId: collection2.id,
      mediaId: media3.id,
      position: 2,
    },
  });

  // Add collection members
  await prisma.collectionUser.create({
    data: {
      collectionId: collection1.id,
      userId: user2.id,
      role: "READER",
      accepted: true,
    },
  });

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
