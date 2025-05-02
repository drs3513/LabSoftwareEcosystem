import type { CustomMessageTriggerHandler } from "aws-lambda";

export const handler: CustomMessageTriggerHandler = async (event) => {
    if (event.triggerSource === "CustomMessage_ForgotPassword") {
        const locale = event.request.userAttributes["locale"];
        if (locale === "en") {
            event.response.emailMessage = `Your new one-time code is ${event.request.codeParameter}`;
            event.response.emailSubject = "Lab Software Ecosystem - Password Reset";
        }
    }

    if(event.triggerSource == "CustomMessage_SignUp") {
        event.response.emailMessage = `Your code is ${event.request.codeParameter}`;


        event.response.emailSubject = 'Thank you for signing up for the Algorithmic Self-Assembly Lab\'s Software Ecosystem!';
    }

    if (event.triggerSource === "CustomMessage_AdminCreateUser") {
        event.response.emailMessage = `An account has been designated for you, under the email ${event.request.usernameParameter}. 
        
        Your temporary password is ${event.request.codeParameter}`;


        event.response.emailSubject = 'Welcome to the Algorithmic Self-Assembly Lab\'s Software Ecosystem!';
    }

    return event;
};