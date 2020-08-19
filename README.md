# minimo

minimo is a thoughtful data & metadata storage system for small labs. 

All too often we want to revisit data and struggle with a loss of context-- old data is hard to find, hard to understand, hard to fuse. If hygiene is applied to the initial data commit process, lots of blood, sweat, and tears can be avoided. An ounce of prevention...

> Raw data and metadata are inseparably linked. This is the central principle of minimo.

However, raw data are typically LARGE and not a great fit for most database implementations. Metadata, on the other hand, are typically small but benefits greatly from structure and semantics to allow efficient search and selection.

minimo is a lightweight web app that facilitates storage of experimental data (e.g. microscope video files) and associated metadata (e.g. apparatus used for recording or treatment applied to recorded subject). It is designed to handle large data types and support both local and cloud storage. It takes advantage of current  modern architecture patterns.

App components are:

1. A [MinIO](https://min.io/) server for raw data storage. (because big, chunky data should live in object storage)
2. A [MongoDB](https://www.mongodb.com/) server for metadata storage. (because structured, semantic data should live in a DB)
3. A [Node](https://nodejs.org) server which provides an interface for uploading and accessing raw data and metadata. (to provide human convenience and enforce human annotation hygiene)
4. A [Traefik](https://containo.us/traefik/) server which acts as a reverse proxy for the other three components. (because, glue)

All bundled up for you to keep things nice and easy!



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

Docker makes installation easy. This repo provides a Dockerized version of minimo. To deploy it with default settings, just follow these steps:

1. Clone this repo.
2. Install [Docker](https://docs.docker.com/get-docker/).
3. Install [Docker Compose](https://docs.docker.com/compose/install/).
4. Run `docker-compose up -d --build` from the repo's root directory.

For non-default settings, just prepend the command in step 4 above with any of the following user option flags:

1. `HOST_NAME`: Set this to your host's hostname or local IP address if you'd like your minimo instance to be reachable from other machines on your network.
2. `MINIO_ACCESS_KEY`: Think of this as the administrator username for your MinIO service. Specify a value if you don't want to use the default.
3. `MINIO_SECREY_KEY`: Think of this as the administrator password for your MinIO service. Specify a value if you don't want to use the default.
4. `MINIO_DATA_DIRECTORY`: If you would like to use an existing directory on your host for data storage, use this flag to specify the absolute path of that directory.
5. `MINIO_COMMAND`: If you would like to start MinIO with a command other than `server`, use this flag to specify that command.

So, to bring up an instance with all five optional values specified, you would run `MINIO_ACCESS_KEY=youraccesskey MINIO_SECRET_KEY=yoursecretkey HOST_NAME=yourhostname MINIO_DATA_DIRECTORY=/your/directory/path MINIO_COMMAND=gateway\ nas docker-compose up -d --build`. Note that if you have brought up a MinIO service previously, you will need to [rotate its credentials](https://github.com/minio/minio/tree/master/docs/config#rotating-encryption-with-new-credentials) in order to specify a new `MINIO_ACCESS_KEY` or `MINIO_SECRET_KEY`.

The app should now be accessible at `http://minimo.localhost`. By default, the username and password for the data browser will both be `minioadmin`.

Note that because minimo uses self-generated TLS certificates, you will probably need to acknowledge a security warning in your browser when loading the web app for the first time and periodically thereafter.

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

# user management

By default, minimo does not require user authentication. If you would like to restrict access to your minimo instance to some set authorized users, you can do so by going to the `manage-users` endpoint and creating login credentials for those users. Once the first set of user credentials has been created, access to all pages other than the FAQ will be limited to authorized users. The `manage-users` page also exposes interfaces for updating the current user's password, removing existing user accounts, and toggling administrator status on existing accounts.

By default, all accounts are created with administrator status set to false. If you would like to restrict access to the interfaces for adding and removing users and toggling administrator status to only a subset of authorized users, you can do so by toggling administrator status to true for that subset. Like with user account creation, once any administrator has been designated, access to this "administrator" functionality will be limited to users with administrator status set to true.

If all user accounts are removed, your instance will revert to its default behavior of not requiring authentication. Similarly, if administrator access toggles for all accounts are set to false, your instance will revert to its default behavior of granting administrator access to all users.

# security

minimo uses [Passport](http://www.passportjs.org/) for user authentication. It exposes its Node and MinIO servers through a [Traefik](https://containo.us/traefik/) reverse proxy which is configured to route all requests through HTTPS.

We've made an effort to be diligent here, but we are not yet comfortable recommending minimo for use outside of trusted networks. One reason for this is that minimo currently uses unverifiable self-generated TLS certificates. If you wish to deploy your instance to a publicly accessible host, we recommend at a bare minimum that you update your Traefik container to use a certificate signed by a trusted CA.

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

This repo contains a [Dockerized](https://www.docker.com/) version of the app that bundles all three components behind a reverse proxy for easy deployment and tinkering. We hope that this will allow curious prospective users to get a feel for whether it might suit their needs.

We're working on formalizing "production" deployment steps, but in the meantime, if you like it and would like help deploying it for production use, please feel free to reach out to us!

# what can I change?

Anything! We welcome issues and pull requests.

You may also want to change some infrastructure for your deployment. For example, our lab uses an mlab MongoDB endpoint (rather than a local one), and we run our MinIO server in gateway mode against a separate NAS device. You might also prefer to use a cloud endpoint (probably S3) for your raw data storage or for data backups. Changes of this sort should be fairly easy to make locally.

# contact us

minimo was put together by members of UCSF's [Foundations of Cognition Lab](http://saulkato.com/focolab/team.htm). Please feel free to contact us through the Issues section of this repository if you run into problems or have suggestions for improvements. We're happy to hear your input!
