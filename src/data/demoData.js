import { generateId } from "../utils/helpers";

export function createStarterContent(userId) {
  const folderId = generateId("folder");
  const setId = generateId("set");

  return {
    folders: [
      {
        id: folderId,
        userId,
        name: "Starter Decks",
        description: "A sample folder to show the study flow.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    sets: [
      {
        id: setId,
        userId,
        folderId,
        title: "Spanish Basics",
        description: "Starter vocabulary for your first learn session.",
        tags: ["Languages", "Starter"],
        cards: [
          {
            id: generateId("card"),
            front: "Hola",
            back: "Hello",
            imageUrl: "",
          },
          {
            id: generateId("card"),
            front: "Gracias",
            back: "Thank you",
            imageUrl: "",
          },
          {
            id: generateId("card"),
            front: "Libro",
            back: "Book",
            imageUrl: "",
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}
