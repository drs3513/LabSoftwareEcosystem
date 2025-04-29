## Lab Software Ecosystem

This repository provides a startup designed for centralizing file storage and communication without the need for various tools.

## Overview

Research labs are at the forefront of innovation and happen with collaboration between
sometimes dozens of researchers. Processes can be roadblocked by poor organization of files and
scattered, untracked communication. It is crucial to remedy these problems to ensure the
efficiency and productivity of cutting-edge labs. Our Lab Software Ecosystem aims to both
centralize the communications between lab researchers in conjunction with providing a secure
storage of vital lab files and experiments. This will be interfaced with an efficient, user-friendly
web front end that can access web-hosted file storage. Providing solutions for these obstacles
will streamline the research workflow in team-based lab research. Important information will be
well-documented and accessible, readily visible to mitigate redundancy, and properly secured to
control access to each project.

## Features

- **Authentication**: Set up with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.
- **Storage**: Real-time storage access powered by Amazon S3 bucket. 

## Deploying to AWS

Copy this repository to your own. **Hint** If using GitUI, git clone https://github.com/drs3513/LabSoftwareEcosystem/tree/main in the repository will duplicate it
In AWS, open AWS Amplify. Select Create new app. In Choose Source Code Provider, select GitHub. Sign in and select the repository that holds the clone. Select the main branch.
On the next page, the settings are optional. (Base settings were used in development.) Review and deploy. 

Now a base file management platform is being deployed, ready to be developed and improved. 

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License
This project is based on a starter template licensed under the [MIT-0 License](LICENSE).  
All modifications and additions are released under the same license unless otherwise stated.
