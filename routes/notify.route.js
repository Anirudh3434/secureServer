import Router from "express";
import { handleBroadcastNotification, singleNotificationHandler, MessageHandler } from "../controller/notify.controller.js";

const router = Router();

router.route("/alert").post((req, res) => {
   handleBroadcastNotification(res, 'alert', 'Alert', 'Your application has been submitted successfully.')
});

router.route("/promotion").post((req, res) => {
   handleBroadcastNotification(res, 'promotion', 'Promotion Alert', 'Check out our latest promotion!')
});

router.route('/application_status').post((req, res) =>
  singleNotificationHandler(req, res, 'Application Update', 'Your application at ABC Corp is under review.')
);


router.route('/profile-viewed').post((req, res) =>
    singleNotificationHandler(req, res, 'Your Profile was Viewed', 'Your profile was viewed')
  );
  
router.route('/interview-reminder').post((req, res) =>
    singleNotificationHandler(req, res, 'Interview Reminder', req.body.message || 'Your interview is scheduled')
  );
  
router.route('/offer-letter').post((req, res) =>
    singleNotificationHandler(req, res, 'Offer Letter', '')
);

router.route('/message').post((req, res) =>
    MessageHandler(req, res)
  );


     

export default router;