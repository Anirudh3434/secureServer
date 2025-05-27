import Router from "express";
import { handleBroadcastNotification, singleNotificationHandler } from "../controller/notify.controller.js";

const router = Router();

router.route("/alert").post((req, res) => {
   handleBroadcastNotification(res, 'alert', 'Alert', 'Your application has been submitted successfully.')
});

router.route("/promotion").post((req, res) => {
   handleBroadcastNotification(res, 'promotion', 'Promotion Alert', 'Check out our latest promotion!')
});

router.route('/profile-viewed').post((req, res) =>
    singleNotificationHandler(req, res, 'Your Profile was Viewed', 'Your profile was viewed')
  );
  
router.route('/interview-reminder').post((req, res) =>
    singleNotificationHandler(req, res, 'Interview Reminder', req.body.message || 'Your interview is scheduled')
  );
  
router.route('/offer-letter').post((req, res) =>
    singleNotificationHandler(req, res, 'Offer Letter Received', "Congratulations! You've received an offer.")
);
     

export default router;