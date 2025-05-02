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

**1.** Copy this repository to your own. 
**Hint** If using GitUI, git clone https://github.com/drs3513/LabSoftwareEcosystem/tree/main in the repository will duplicate it

**2.** Create an AWS Amplify Account

**3.** Navigate to this link : [https://console.aws.amazon.com/amplify/create/repo-branch], and follow the instructions provided.

**4.** The web application is now being deployed. A link to your live deployment may be found by opening the 'Amplify' section of the AWS Console (may be found through the search bar), and clicking on the name that you gave your github repository.

**5.** The web app works as a 'walled garden' in that only administrators may invite, or remove individual users. However, in order for this to work there must be an administrator account to 'boostrap' the process. Below are the instructions on how to create an administrator account : 

**6.** In the AWS Console, enter the 'Cognito' section (may be found through the search bar). 

**7** Open the most recently created 'Userpool'

**8** On the left click 'Users', and then 'Create User'

**9** Enter your desired email address and password. 

**10** Open on the 'user name' of the account that you just created, and click 'add user to group'.

**11** Add your user account to the 'ADMINISTRATOR' group.

**12** Navigate back to the deployed webpage, and log in with your previously used username and password.

**13** If you would like to add any more users to the application, once you are logged in you may navigate to "Users" -> "Administration", and input the emails of new users to add directly into the input box provided.


The live deployment created as a result of this project may be found at [https://main.d1hofgr0dblvu2.amplifyapp.com]

## Disclaimer

All icons are either original, or edited versions of those which may be found at [https://lineicons.com/]

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License
This project is based on a starter template licensed under the [MIT-0 License](LICENSE).  
All modifications and additions are released under the same license unless otherwise stated.

