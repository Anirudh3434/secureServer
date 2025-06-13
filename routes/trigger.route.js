import Router from "express";
import Pusher from "pusher";

const router = Router();

const pusher = new Pusher({


  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  useTLS: true
});

router.route("/").post((req, res) => {
  console.log('📥 Trigger request received:', req.body);
    pusher.trigger(req.body.channel_name, "message", {
        message: 'messages'
      });
      
      res.send("✅ Triggered successfully");
});

export default router;
