# minimo

minimo is a simple web app for storage and association of experimental data (e.g. microscope video files) and metadata (e.g. apparatus used for recording or treatment applied to recorded subject).

App components include:

1. A [MinIO](https://min.io/) server for raw data storage.
2. A [MongoDB](https://www.mongodb.com/) server for metadata storage.
3. A [Node](https://nodejs.org) server which provides an interface for uploading and accessing raw data and metadata.

Data and and metadata are uploaded through the app's web interface, as shown below. Data are uploaded through a simple folder selector, and metadata are entered through user configurable text or dropdown form fields.

| ![minimo upload flow](https://github.com/Borchardt/image_hosting/blob/master/foco_db_upload.png?raw=true) | 
|:--:| 
| *minimo data/metadata uploader* |

Once uploaded, metadata and data can be accessed through the app's embedded browsers. The metadata browser for a fresh instance with only two entries is shown below.

| ![minimo metadata browser](https://github.com/Borchardt/image_hosting/blob/master/foco_db_metadata_browser.png?raw=true) | 
|:--:| 
| *minimo metadata browser* |

Within the metadata browser, clicking the "folderID" hyperlink for any metadata entry will bring the user to the associated experimental data folder in the MinIO browser. For example, clicking on the "20200629_JMB" hyperlink in the previous image results in the MinIO browser view below. The data browser may also be accessed directly (without going through the metadata browser).

| ![minimo data browser](https://github.com/Borchardt/image_hosting/blob/master/foco_db_data_browser.png?raw=true) | 
|:--:| 
| *embedded MinIO data browser* |

# deployment

This repo provides a Dockerized version of minimo. To deploy it with default settings, just follow these steps:

1. Clone this repo.
2. Install [Docker](https://docs.docker.com/get-docker/).
3. Install [Docker Compose](https://docs.docker.com/compose/install/).
4. Run `docker-compose up -d --build` from the repo's root directory.

For non-default settings, just prepend the command in step 4 above with any of the following user option flags:

1. `MINIO_ENDPOINT`: Set this to your host's local IP address if you'd like your minimo instance to be reachable from other machines on your network.
2. `MINIO_ACCESS_KEY`: Think of this as the administrator username for your MinIO service. Specify a value if you don't want to use the default.
3. `MINIO_SECREY_KEY`: Think of this as the administrator password for your MinIO service. Specify a value if you don't want to use the default.

So, to bring up an instance with all three optional values specified, you would run `MINIO_ACCESS_KEY=<accesskey> MINIO_SECRET_KEY=<secretkey> MINIO_ENDPOINT=<IP ADDRESS> docker-compose up -d --build`. Note that if you have brought up a MinIO service previously, you will need to [rotate its credentials](https://github.com/minio/minio/tree/master/docs/config#rotating-encryption-with-new-credentials) in order to specify a new `MINIO_ACCESS_KEY` or `MINIO_SECRET_KEY`.

The app should now be accessible at `http://localhost:5000`. By default, the username and password for the data browser will both be `minioadmin`.

# use

Before uploading data and metadata, you will need to create some metadata forms to represent the fields you'd like associated with your data. As an example, you can create a simple "Comments" field as follows:

1. Go to the "MANAGE FORMS" page.
2. Click "CREATE a new metadata form entry."
3. In the form field, add the following three lines:
    ```
    comments
    Comments?
    text
    ```
    These represent the field name ("comments"), the form prompt for the field ("Comments?"), and the form data type (text).
4. Click "submit form."

Now, your comments field will be available for all new data submissions! You can submit some experimental data and associated metadata as follows:

1. Go to the "MANAGE DATA" page.
2. Click "SUBMIT lab data and metadata."
3. Within the file browser on this page, select the folder which contains your experimental data.
4. In the "Number of experiments" dropdown, select "1."
5. In the "Experiment number 1" form, enter your comments afte the "Comments?" prompt.
6. Click "submit."

Now, you should be able to see your metadata in the metadata browser and its associated experimental data in the data browser!

# technical details

minimo is really just a lightweight [Node](https://nodejs.org) web server. This server talks to [MinIO](https://min.io/) and [MongoDB](https://www.mongodb.com/) servers, which store experimental data and metadata respectively, and it serves pages which allow upload of data to and access to data on those servers.

<center>

| ![minimo architecture](https://github.com/Borchardt/image_hosting/blob/master/foco_db_minio_diagram.png?raw=true) | 
|:--:| 
| *minimo architecture* |

</center>

This architecture offers several advantages over other options that we considered:

1. **It supports very large files.** MinIO, which we use for raw data storage, supports file sizes up to 5TB. Since our lab deals primarily in volumetric microscope videos, which can grow quite large, this ability was important to us.
2. **It provides both easy human access and robust programmatic access to its data stores.** We hope that our web interface, which abstracts away the technical details of data and metadata storage, will allow users to access and upload data with little overhead. At the same time, users interested in accessing data programmatically can do so with MinIO's and MongoDB's SDKs.
3. **Each of its components can be deployed both on local hardware and in the cloud.** The app's Node server can be run either on a local machine or on a cloud server. It supports both local and cloud hosted MongoDB endpoints for metadata storage. MinIO is compatible with AWS S3, so it is possible use S3 in place of local hardware for data storage and/or backup. This gives users a large degree of control over the costs and operational loads they will incur and over the performance they will achieve.
4. **It is lightweight enough to be easily extensible.** We intend to continue to add functionality to the app, and we want to allow and encourage our users to do the same!

This repo contains a [Dockerized](https://www.docker.com/) version of the app that bundles all three components for easy deployment and tinkering. We hope that this will allow curious prospective users to get a feel for whether it might suit their needs.

We're working on streamlining production deployment steps, but in the meantime, if you like it and would like help deploying it for production use, please feel free to reach out to us!

# what can I change?

Anything! We welcome issues and pull requests.

You may also want to change some infrastructure for your deployment. For example, our lab uses an mlab MongoDB endpoint (rather than a local one), and we run our MinIO server in gateway mode against a separate NAS device. You might also prefer to use a cloud endpoint (probably S3) for your raw data storage or for data backups. Changes of this sort should be fairly easy to make locally.

# what isn't included?

This is a pared down version of the branch that our lab uses. We'll try to port features here as we add them, but there are a few things on our branch that wouldn't make sense for a more general user base. Currently, the most notable such thing is our authentication flow. In the future, we may move to a flow that generalizes better than the one we use now; in the meantime, we've left a barebones `checkAuth` function in `server.js` so that you can add your own authentication flow if you so desire.

# contact us

minimo was put together by members of UCSF's [FOCO Lab](http://saulkato.com/focolab/team.htm). Please feel free to contact us through the Issues section of this repository if you run into problems or have suggestions for improvements. We're happy to hear your input!