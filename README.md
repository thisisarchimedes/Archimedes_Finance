# Archimedes_Finance

## DISCLAIMER

THIS CODE AND RELATED DOCUMENTS ARE PROVIDED ON AN "AS IS" BASIS. ARCHIMEDES SOLUTIONS, ITS OFFICERS, EMPLOYEES, AND AFFILIATES (COLLECTIVELY "ARCHIMEDES SOLUTIONS") MAKE NO REPRESENTATIONS OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, AS TO THESE INSTRUCTIONS, RELATED CODE, BUILD SCRIPTS, OR ANY THIRD PARTY PACKAGES.
YOU EXPRESSLY AGREE THAT YOUR USE OF THIS CODE IS AT YOUR SOLE RISK.
ARCHIMEDES SOLUTIONS WILL NOT BE LIABLE FOR ANY DAMAGES OF ANY KIND ARISING FROM THE USE OF THIS CODE INCLUDING, BUT NOT LIMITED TO, DIRECT, INDIRECT, INCIDENTAL, PUNITIVE, AND CONSEQUENTIAL DAMAGES.

## Getting Started

### Installations

To clone and contribute to the project, you will need [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](https://www.npmjs.com/)) installed on your computer.

For Windows, you should download [Git Bash](https://gitforwindows.org/) for using the terminal.

For MacOS/Linux, you should already have a terminal pre-installed with the operating system.

If you have not already downloaded a text-based code editor, you should download [Visual Studio Code](https://code.visualstudio.com/).

### Using Git and GitHub

For those who have not already:

First, you must create a [GitHub](https://github.com/) account and be added as an contributor to this repository. Follow this [guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) to generate a new SSH key and add it to your GitHub account. For a refresher on Git and GitHub, watch this [tutorial](https://www.youtube.com/watch?v=tRZGeaHPoaw).

Then, choose the directory where you want to clone the project repository.

```bash
# Choose the directory for the repository
$ cd PATH_TO_REPO

# Clone this repository
$ git clone https://github.com/thisisarchimedes/Archimedes_Finance.git

# Go to the root directory of the repository
$ cd Archimedes_Finance
```

### Node.js Packages

Once in the root directory, use the Node package manager npm to install hardhat.

```bash
$ npm install --save-dev hardhat
```

### Running Unit Tests

Use hardhat to run unit tests

```bash
$ npx hardhat test
```

### Common Issues

-   "ProviderError: Must be authenticated!": related to git hub private repo not being able to be checked out. One simple fix is to clone secrets repo inside this folder to have Archimedes_Finance/secrets:

```bash
$ git clone https://github.com/thisisarchimedes/secrets.git
```
