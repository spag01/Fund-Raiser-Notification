require('dotenv').config()

const express = require('express')
const nodemailer = require("nodemailer");
const nodeHtmlToImage = require('node-html-to-image');
const bodyParser = require('body-parser')
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf");
const jwt = require('jsonwebtoken');
const app = express()
const axios = require('axios')
const dirPath = path.join(__dirname, "public/receipts");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

//require the Twilio module and create a REST client
const client = require('twilio')(accountSid, authToken);

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true}))
app.use(express.raw({ type: 'application/json' }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.get('/template',(req,res)=>{
  console.log('hello')
  res.download(dirPath+'/template.pdf');
});

app.post('/sendMessageAndEmail',async(req, res) => {
  console.l 

  //console.log(req);
  const {name,email_id,mobile_no} =(req.body?.transaction?.customer);
  const date = new Date(req.body.transaction.date*1000);
  let month = date.getMonth() + 1;
  let dateString = date.getDate() + "-" + month + "-" + date.getFullYear();
  const amount = req.body.transaction.order.gross_amount;
  const payment_id = req.body.transaction.payment_id;
  const url = `${req.hostname+'/getCertificate?Name='+jwt.sign(name,process.env.KEY)+'&Amount='+jwt.sign(amount,process.env.KEY)+'&Date='+jwt.sign(dateString,process.env.KEY)+'&id='+payment_id}`;
  console.log(url)
  if(email_id && mobile_no){
      console.log(process.env.EMAIL,process.env.PASSWORD)
      let transporter = nodemailer.createTransport(
      {
        service:'gmail',
        host: 'smtp.gmail.com',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
        tls :{
          rejectUnauthorized : false
        }

      });
      try{
        let info = await transporter.sendMail({
          from: process.env.EMAIL,
          to: [email_id], 
          subject: "Thanks For Donating", 
          text: `नमस्कार ${name},\n\nस्वदेशी शोध संस्थान के निर्माण कार्य हेतु अपना महत्वपूर्ण योगदान देने के लिए धन्यवाद। Download Certificate: ${url}`, 
        });
        console.log(info)
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      
        // client.messages
        // .create({
        //   to: '+91' + mobile_no,
        //   from: '+15306758417',
        //   body: `नमस्कार ${name},\n\nस्वदेशी शोध संस्थान के निर्माण कार्य हेतु अपना महत्वपूर्ण योगदान देने के लिए धन्यवाद। Download Certificate: ${url}`,
        // })
        // .then(message =>{
        //    console.log(message);
        //    console.log(message.sid)
           res.status(200).json({message:'Success'});
           
        //});
    }
    catch(err){
      console.log(err)
      res.status(401).json({message : 'Bad Request'})
    }
  }
  else{
    res.status(401).json({message : 'Enter Proper Email and Phone Number'})
  }
})
app.get('/', (req, res) => {
  console.log(req);

  res.status(200).json({message:'Home Page'});
})

app.get('/getCertificate', (req, res) => {
  let donorInfo = {
    Name : jwt.decode(req.query.Name),
    Amount : jwt.decode(req.query.Amount),
    Date : jwt.decode(req.query.Date)
  }

  res.render(__dirname + "/public/pdfGenerator.ejs", {DonorInfo: donorInfo}, (err, data) => {
    var config =
    {
      format: 'A5',
      orientation: "landscape"
    };
    
    pdf.create(data, config).toFile(dirPath + "/receipt-" + req.query.id + ".pdf", function (err, data) {
      if (err) {
        return res.send(err);
      } 
      else {
        return res.download(dirPath + "/receipt-" + req.query.id + ".pdf", "receipt-donation.pdf", function(err) {
          if (err) {
            console.log(err);
          }
          fs.unlink(dirPath + "/receipt-" + req.query.id + ".pdf", function(){
              console.log("File was deleted");
          });
        });
      }
    });
  });


});


// app.get('/testApi', async (req,res)=>{
//   const data = require('./test.json')
//   console.log(data)
//   for(var i=0;i<200;i++){
//     try{
//       const res = await axios.get('https://message-email-api.herokuapp.com/',data);
//       console.log(res.data)
//     }
//     catch(e){
//       console.log(e);
//     }
//   }
// })
  
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})