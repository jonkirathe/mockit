import express from "express";
import { validateCsrfToken } from "../middleware/validation.js";
import { validateAccessToken } from "../middleware/auth.js";

const router = express.Router();

let pets = [
    {
        "id": 1,
        "name": "Pet 1",
        "breed": "Breed 1",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 1.",
        "careSuggestions": "Care suggestions for pet 1.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet1.jpg"
    },
    {
        "id": 2,
        "name": "Pet 2",
        "breed": "Breed 2",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 2.",
        "careSuggestions": "Care suggestions for pet 2.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet2.jpg"
    },
    {
        "id": 3,
        "name": "Pet 3",
        "breed": "Breed 3",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 3.",
        "careSuggestions": "Care suggestions for pet 3.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet3.jpg"
    },
    {
        "id": 4,
        "name": "Pet 4",
        "breed": "Breed 4",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 4.",
        "careSuggestions": "Care suggestions for pet 4.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet4.jpg"
    },
    {
        "id": 5,
        "name": "Pet 5",
        "breed": "Breed 5",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 5.",
        "careSuggestions": "Care suggestions for pet 5.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet5.jpg"
    },
    {
        "id": 6,
        "name": "Pet 6",
        "breed": "Breed 6",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 6.",
        "careSuggestions": "Care suggestions for pet 6.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet6.jpg"
    },
    {
        "id": 7,
        "name": "Pet 7",
        "breed": "Breed 7",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 7.",
        "careSuggestions": "Care suggestions for pet 7.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet7.jpg"
    },
    {
        "id": 8,
        "name": "Pet 8",
        "breed": "Breed 8",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 8.",
        "careSuggestions": "Care suggestions for pet 8.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet8.jpg"
    },
    {
        "id": 9,
        "name": "Pet 9",
        "breed": "Breed 9",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 9.",
        "careSuggestions": "Care suggestions for pet 9.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet9.jpg"
    },
    {
        "id": 10,
        "name": "Pet 10",
        "breed": "Breed 10",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 10.",
        "careSuggestions": "Care suggestions for pet 10.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet10.jpg"
    },
    {
        "id": 11,
        "name": "Pet 11",
        "breed": "Breed 11",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 11.",
        "careSuggestions": "Care suggestions for pet 11.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet11.jpg"
    },
    {
        "id": 12,
        "name": "Pet 12",
        "breed": "Breed 12",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 12.",
        "careSuggestions": "Care suggestions for pet 12.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet12.jpg"
    },
    {
        "id": 13,
        "name": "Pet 13",
        "breed": "Breed 13",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 13.",
        "careSuggestions": "Care suggestions for pet 13.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet13.jpg"
    },
    {
        "id": 14,
        "name": "Pet 14",
        "breed": "Breed 14",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 14.",
        "careSuggestions": "Care suggestions for pet 14.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet14.jpg"
    },
    {
        "id": 15,
        "name": "Pet 15",
        "breed": "Breed 15",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 15.",
        "careSuggestions": "Care suggestions for pet 15.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet15.jpg"
    },
    {
        "id": 16,
        "name": "Pet 16",
        "breed": "Breed 16",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 16.",
        "careSuggestions": "Care suggestions for pet 16.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet16.jpg"
    },
    {
        "id": 17,
        "name": "Pet 17",
        "breed": "Breed 17",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 17.",
        "careSuggestions": "Care suggestions for pet 17.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet17.jpg"
    },
    {
        "id": 18,
        "name": "Pet 18",
        "breed": "Breed 18",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 18.",
        "careSuggestions": "Care suggestions for pet 18.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet18.jpg"
    },
    {
        "id": 19,
        "name": "Pet 19",
        "breed": "Breed 19",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 19.",
        "careSuggestions": "Care suggestions for pet 19.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet19.jpg"
    },
    {
        "id": 20,
        "name": "Pet 20",
        "breed": "Breed 20",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 20.",
        "careSuggestions": "Care suggestions for pet 20.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet20.jpg"
    },
    {
        "id": 21,
        "name": "Pet 21",
        "breed": "Breed 21",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 21.",
        "careSuggestions": "Care suggestions for pet 21.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet21.jpg"
    },
    {
        "id": 22,
        "name": "Pet 22",
        "breed": "Breed 22",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 22.",
        "careSuggestions": "Care suggestions for pet 22.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet22.jpg"
    },
    {
        "id": 23,
        "name": "Pet 23",
        "breed": "Breed 23",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 23.",
        "careSuggestions": "Care suggestions for pet 23.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet23.jpg"
    },
    {
        "id": 24,
        "name": "Pet 24",
        "breed": "Breed 24",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 24.",
        "careSuggestions": "Care suggestions for pet 24.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet24.jpg"
    },
    {
        "id": 25,
        "name": "Pet 25",
        "breed": "Breed 25",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 25.",
        "careSuggestions": "Care suggestions for pet 25.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet25.jpg"
    },
    {
        "id": 26,
        "name": "Pet 26",
        "breed": "Breed 26",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 26.",
        "careSuggestions": "Care suggestions for pet 26.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet26.jpg"
    },
    {
        "id": 27,
        "name": "Pet 27",
        "breed": "Breed 27",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 27.",
        "careSuggestions": "Care suggestions for pet 27.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet27.jpg"
    },
    {
        "id": 28,
        "name": "Pet 28",
        "breed": "Breed 28",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 28.",
        "careSuggestions": "Care suggestions for pet 28.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet28.jpg"
    },
    {
        "id": 29,
        "name": "Pet 29",
        "breed": "Breed 29",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 29.",
        "careSuggestions": "Care suggestions for pet 29.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet29.jpg"
    },
    {
        "id": 30,
        "name": "Pet 30",
        "breed": "Breed 30",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 30.",
        "careSuggestions": "Care suggestions for pet 30.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet30.jpg"
    },
    {
        "id": 31,
        "name": "Pet 31",
        "breed": "Breed 31",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 31.",
        "careSuggestions": "Care suggestions for pet 31.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet31.jpg"
    },
    {
        "id": 32,
        "name": "Pet 32",
        "breed": "Breed 32",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 32.",
        "careSuggestions": "Care suggestions for pet 32.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet32.jpg"
    },
    {
        "id": 33,
        "name": "Pet 33",
        "breed": "Breed 33",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 33.",
        "careSuggestions": "Care suggestions for pet 33.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet33.jpg"
    },
    {
        "id": 34,
        "name": "Pet 34",
        "breed": "Breed 34",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 34.",
        "careSuggestions": "Care suggestions for pet 34.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet34.jpg"
    },
    {
        "id": 35,
        "name": "Pet 35",
        "breed": "Breed 35",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 35.",
        "careSuggestions": "Care suggestions for pet 35.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet35.jpg"
    },
    {
        "id": 36,
        "name": "Pet 36",
        "breed": "Breed 36",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 36.",
        "careSuggestions": "Care suggestions for pet 36.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet36.jpg"
    },
    {
        "id": 37,
        "name": "Pet 37",
        "breed": "Breed 37",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 37.",
        "careSuggestions": "Care suggestions for pet 37.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet37.jpg"
    },
    {
        "id": 38,
        "name": "Pet 38",
        "breed": "Breed 38",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 38.",
        "careSuggestions": "Care suggestions for pet 38.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet38.jpg"
    },
    {
        "id": 39,
        "name": "Pet 39",
        "breed": "Breed 39",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 39.",
        "careSuggestions": "Care suggestions for pet 39.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet39.jpg"
    },
    {
        "id": 40,
        "name": "Pet 40",
        "breed": "Breed 40",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 40.",
        "careSuggestions": "Care suggestions for pet 40.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet40.jpg"
    },
    {
        "id": 41,
        "name": "Pet 41",
        "breed": "Breed 41",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 41.",
        "careSuggestions": "Care suggestions for pet 41.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet41.jpg"
    },
    {
        "id": 42,
        "name": "Pet 42",
        "breed": "Breed 42",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 42.",
        "careSuggestions": "Care suggestions for pet 42.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet42.jpg"
    },
    {
        "id": 43,
        "name": "Pet 43",
        "breed": "Breed 43",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 43.",
        "careSuggestions": "Care suggestions for pet 43.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet43.jpg"
    },
    {
        "id": 44,
        "name": "Pet 44",
        "breed": "Breed 44",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 44.",
        "careSuggestions": "Care suggestions for pet 44.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet44.jpg"
    },
    {
        "id": 45,
        "name": "Pet 45",
        "breed": "Breed 45",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 45.",
        "careSuggestions": "Care suggestions for pet 45.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet45.jpg"
    },
    {
        "id": 46,
        "name": "Pet 46",
        "breed": "Breed 46",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 46.",
        "careSuggestions": "Care suggestions for pet 46.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet46.jpg"
    },
    {
        "id": 47,
        "name": "Pet 47",
        "breed": "Breed 47",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 47.",
        "careSuggestions": "Care suggestions for pet 47.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet47.jpg"
    },
    {
        "id": 48,
        "name": "Pet 48",
        "breed": "Breed 48",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 48.",
        "careSuggestions": "Care suggestions for pet 48.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet48.jpg"
    },
    {
        "id": 49,
        "name": "Pet 49",
        "breed": "Breed 49",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 49.",
        "careSuggestions": "Care suggestions for pet 49.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet49.jpg"
    },
    {
        "id": 50,
        "name": "Pet 50",
        "breed": "Breed 50",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 50.",
        "careSuggestions": "Care suggestions for pet 50.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet50.jpg"
    }
];

router.post("/", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const { name, breed, age, gender, ownerId, description, careSuggestions, animalType } =
            req.body;

        if (!name || !animalType) {
            return res.status(400).json({
                error: "Missing required fields",
                code: "missing_required_fields"
            });
        }

        const newPet = {
            id: pets.length ? Math.max(...pets.map((p) => p.id)) + 1 : 1,
            name,
            breed,
            age,
            gender,
            ownerId: ownerId || req.user.id,
            description,
            careSuggestions,
            animalType,
            createdAt: new Date().toISOString()
        };

        pets.push(newPet);
        res.status(201).json({ pet: newPet });
    } catch (error) {
        res.status(500).json({
            error: "Failed to create pet",
            code: "pet_creation_failed"
        });
    }
});

router.get("/", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const userPets = pets.filter((pet) => pet.ownerId === req.user.id);
        res.json({ pets: userPets });
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve pets",
            code: "pet_retrieval_failed"
        });
    }
});

router.get("/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const pet = pets.find(
            (p) => p.id === parseInt(req.params.id) && p.ownerId === req.user.id
        );

        if (!pet) {
            return res.status(404).json({
                error: "Pet not found",
                code: "pet_not_found"
            });
        }

        res.json({ pet });
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve pet",
            code: "pet_retrieval_failed"
        });
    }
});

router.put("/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const petIndex = pets.findIndex(
            (p) => p.id === parseInt(req.params.id) && p.ownerId === req.user.id
        );

        if (petIndex === -1) {
            return res.status(404).json({
                error: "Pet not found",
                code: "pet_not_found"
            });
        }

        const updatedPet = {
            ...pets[petIndex],
            ...req.body,
            id: parseInt(req.params.id),
            ownerId: pets[petIndex].ownerId
        };

        pets[petIndex] = updatedPet;
        res.json({ pet: updatedPet });
    } catch (error) {
        res.status(500).json({
            error: "Failed to update pet",
            code: "pet_update_failed"
        });
    }
});

router.delete("/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const petIndex = pets.findIndex(
            (p) => p.id === parseInt(req.params.id) && p.ownerId === req.user.id
        );

        if (petIndex === -1) {
            return res.status(404).json({
                error: "Pet not found",
                code: "pet_not_found"
            });
        }

        const [deletedPet] = pets.splice(petIndex, 1);
        res.json({ pet: deletedPet });
    } catch (error) {
        res.status(500).json({
            error: "Failed to delete pet",
            code: "pet_deletion_failed"
        });
    }
});

export default router;
