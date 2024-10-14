import * as readline from 'readline';

// Interface to handle input/output from console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get user input for two fields
export function getInput(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

export function closeInput() {
    rl.close();
}