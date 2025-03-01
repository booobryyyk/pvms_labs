class Main {
  async run() {
    const button = this.getElement('process');
    const input = this.getElement('prompt');
    const resultDiv = this.getElement('response');

    button.addEventListener('click', () =>
      this.processInput(input.value, resultDiv)
    )
  }

  getElement(elementId) {
    return document.getElementById(elementId)
  }

  async processInput(val, resultDiv) {
    try {
      const payload = {
        input: val,
      }
      console.log(payload)
      const response = await fetch('http://localhost:3000/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      resultDiv.textContent = json.result;
    } catch(e) {
      resultDiv.textContent = "Error: " + e.message;
    }
  }
}

const main = new Main();
main.run();