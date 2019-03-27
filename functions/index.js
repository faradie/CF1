const functions = require('firebase-functions');
 
const admin = require('firebase-admin');
admin.initializeApp();
 
exports.notifyNewMessage = functions.firestore
    .document('Posts/{post_id}/Comments/{comment_id}')
    .onCreate((docSnapshot, context) => {
        const message = docSnapshot.data();
        const recipientId = message['post_owner'];
        const content = message['content'];
        const createdAt = message['created_at'];
 
        return admin.firestore().doc('users/' + recipientId).get().then(userDoc => {
            const registrationTokens = userDoc.get('registrationTokens')
 
            
            const payload = {
                notification: {
                    title: "UNEQIN aja!",
                    body: content,
                    sound: 'default'
                },
                data: {
                    RECIPIENT_ID: recipientId,
                    POST_ID: message['post_id'],
                    clickAction: "FLUTTER_NOTIFICATION_CLICK",
                }
            }
 
            return admin.messaging().sendToDevice(registrationTokens, payload).then( response => {
                const stillRegisteredTokens = registrationTokens
 
                response.results.forEach((result, index) => {
                    const error = result.error
                    if (error) {
                        const failedRegistrationToken = registrationTokens[index]
                        console.error('blah', failedRegistrationToken, error)
                        if (error.code === 'messaging/invalid-registration-token'
                            || error.code === 'messaging/registration-token-not-registered') {
                                const failedIndex = stillRegisteredTokens.indexOf(failedRegistrationToken)
                                if (failedIndex > -1) {
                                    stillRegisteredTokens.splice(failedIndex, 1)
                                }
                            }
                    }
                })
 
                return admin.firestore().doc("users/" + recipientId).update({
                    registrationTokens: stillRegisteredTokens
                })
            })
        })
    })