import * as readline from 'readline';

// Interface to handle input/output from console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get user input for two fields
function getInput(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    const field1 = await getInput("Enter SPL token Address: ");
    const field2 = await getInput("Enter Wallet Address: ");
    
    console.log(`You entered: Field 1 = ${field1}, Field 2 = ${field2}`);
    
    rl.close(); // Close the readline interface
}

main();
