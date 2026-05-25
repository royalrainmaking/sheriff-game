export const CARD_TYPES = {
    APPLE: { name: 'Apple', type: 'legal', value: 2, penalty: 2, color: '#e53935' }, // Red
    CHEESE: { name: 'Cheese', type: 'legal', value: 3, penalty: 2, color: '#ffb300' }, // Yellow
    BREAD: { name: 'Bread', type: 'legal', value: 3, penalty: 2, color: '#8d6e63' }, // Brown
    CHICKEN: { name: 'Chicken', type: 'legal', value: 4, penalty: 2, color: '#fdd835' }, // Light Yellow

    PEPPER: { name: 'Pepper', type: 'contraband', value: 6, penalty: 4, color: '#43a047' }, // Green
    MEAD: { name: 'Mead', type: 'contraband', value: 7, penalty: 4, color: '#8e24aa' }, // Purple
    SILK: { name: 'Silk', type: 'contraband', value: 8, penalty: 4, color: '#1e88e5' }, // Blue
    CROSSBOW: { name: 'Crossbow', type: 'contraband', value: 9, penalty: 4, color: '#546e7a' } // Grey
};

export function createDeck() {
    const deck = [];
    // Standard distribution (approximate for an easy start)
    const addCards = (type, count) => {
        for (let i = 0; i < count; i++) {
            deck.push({ id: Math.random().toString(36).substr(2, 9), ...CARD_TYPES[type] });
        }
    };

    addCards('APPLE', 48);
    addCards('CHEESE', 36);
    addCards('BREAD', 36);
    addCards('CHICKEN', 24);
    addCards('PEPPER', 5);
    addCards('MEAD', 5);
    addCards('SILK', 5);
    addCards('CROSSBOW', 5);

    return shuffle(deck);
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}
