const axios = require('axios');

// TODO remove this and use env or whatever
const endpoint = '';
const b2applicationKey = '';
const b2applicationKeyId = '';
const b2bucketName = '';

const config = {
  b2: {
    // TODO NOTE -- Add dotenv and .env file?
    // or hardcode or... actually manually use env
    // or...
    applicationKeyId: b2applicationKeyId || process.env.B2APPLICATIONKEYID,
    applicationKey: b2applicationKey || process.env.B2APPLICATIONKEY,
    endpointUrl: endpoint || process.env.B2ENDPOINT,
    bucketName: b2bucketName || process.env.B2BUCKETNAME,
  },
};

module.exports = (mode, path) => {
  switch (mode) {
    case 'b2': { // backblaze b2 object storage API
      const getB2 = async ({ previousAuth, fileList = [], startFileName }) => {
        const getB2Auth = async () => {
          const { applicationKey, applicationKeyId } = config.b2;
          const authKey = Buffer.from(`${applicationKeyId}:${applicationKey}`)
            .toString('base64');

          const {
            data: { authorizationToken, apiUrl, allowed: { bucketId } },
          } = await axios({
            method: 'get',
            url: 'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
            headers: {
              Accept: 'application/json',
              Authorization: `Basic ${authKey}`,
            },
          });

          return { apiUrl, bucketId, authorizationToken };
        };

        const auth = previousAuth || await getB2Auth();
        const { apiUrl, bucketId, authorizationToken } = auth;
        const { data: { files, nextFileName } } = await axios({
          method: 'post',
          url: `${apiUrl}/b2api/v2/b2_list_file_names`,
          data: { bucketId, startFileName, maxFileCount: 5000 },
          headers: { Authorization: authorizationToken },
        });
        fileList.push(...files.map(fileRecord => fileRecord.fileName));

        if (nextFileName) {
          await getB2({
            previousAuth: auth,
            fileList,
            startFileName: nextFileName,
          });
        }

        return {
          files: fileList,
          apiUrl,
          authorizationToken,
          bucketId,
        };
      };

      return getB2({});
    }

    case 'fs': { // local filesystem directory
      throw new Error('make image list: fs mode not implemented');

      // dir mode
      // turn dir of jpegs into b64 strings
      // list filenames
      // upload the files to b2 ???

      // eslint-disable-next-line no-unreachable
      if (!path) {
        throw new Error('make image list: fs mode requires path');
      }

      return [];
    }

    default: {
      throw new Error('make image list: unknown or no mode flag');
    }
  }
};
