import express from 'express';
import docusign from 'docusign-esign';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const DOCUSIGN_BASE_PATH = process.env.NODE_ENV === 'production'
  ? 'https://docusign.net/restapi'
  : 'https://demo.docusign.net/restapi';

const docusignClient = new docusign.ApiClient({
  basePath: DOCUSIGN_BASE_PATH,
  oAuthBasePath: 'account-d.docusign.com'
});

app.post('/api/send-envelope', async (req, res) => {
  try {
    const { recipientEmail, recipientName, documentBase64 } = req.body;

    // Initialize DocuSign envelope
    const envelopeDefinition = new docusign.EnvelopeDefinition();
    envelopeDefinition.emailSubject = 'Please sign this document';
    
    // Create document
    const document = new docusign.Document();
    document.documentBase64 = documentBase64;
    document.name = 'Document for signature';
    document.fileExtension = 'pdf';
    document.documentId = '1';

    envelopeDefinition.documents = [document];

    // Create signer
    const signer = docusign.Signer.constructFromObject({
      email: recipientEmail,
      name: recipientName,
      recipientId: '1',
      routingOrder: '1'
    });

    // Create signHere tab
    const signHere = docusign.SignHere.constructFromObject({
      anchorString: '/sig1/',
      anchorYOffset: '10',
      anchorUnits: 'pixels',
      anchorXOffset: '20'
    });

    // Add tabs to signer
    const tabs = docusign.Tabs.constructFromObject({
      signHereTabs: [signHere]
    });
    signer.tabs = tabs;

    // Add recipients to envelope
    const recipients = docusign.Recipients.constructFromObject({
      signers: [signer]
    });
    envelopeDefinition.recipients = recipients;

    // Set envelope status
    envelopeDefinition.status = 'sent';

    // Send envelope
    const envelopesApi = new docusign.EnvelopesApi(docusignClient);
    const results = await envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID!, {
      envelopeDefinition
    });

    res.json({ envelopeId: results.envelopeId });
  } catch (error) {
    console.error('Error sending envelope:', error);
    res.status(500).json({ error: 'Failed to send envelope' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
