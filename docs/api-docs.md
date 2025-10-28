1. About the DHIS2 instance
The DHIS2 instance for your group project can be found at

<BASE_URL>: https://research.im.dhis2.org/in5320g<NUMBER>

Where <NUMBER> must be replaced with your group number.

For example <BASE_URL>= https://research.im.dhis2.org/in5320g50

 

Note: This is NOT the same instance as https://data.research.dhis2.org/in5320, which you interacted with in a compulsory course assignment.

 

You can use these credentials for your instance: User: in5320 Password: P1@tform

You can change the password for your groups' DHIS2 instance after logging in: dhis-web-user-profile/#/account

PS: Please note that from time to time, added files may be purged from these instances, which means that you may sometimes have to reupload your app to the instance.

2. DHIS2 data models
DHIS2 has a two-part data model: Data Sets by year, month, week etc. (mainly for analysis) and Tracker Events with data collected on a specific date (mainly for data input). In addition, the raw data can be processed by the Analytics API, to provide aggregates along a range of dimensions.

Data Set: GET /api/analytics/dataValueSet.json?dataSet=YOUR_DATASET_UID&period=202201&orgUnit=YOUR_ORGUNIT_UID

Tracker Event: GET /api/tracker/events.json?program=YOUR_PROGRAM_UID&orgUnit=YOUR_ORGUNIT_UID

Data collected through the input fields of a data collection form are in DHIS2 linked to three basic dimensions: periods (“when?”), organisation units aka orgunits or simply OU (“where?”) and data elements (“what?”). For periods, the ISO format is used, so that October 2023 becomes “202310”. Your instance contains baseline yearly data for schools. In relation to your project, this data can be understood as a yearly school survey which can be used as a baseline for comparison with school inspection data.

For organisation units, the name, uid, or code can be used (though name is seldom used by applications such as those you are developing here, and not all organisation units have code - so in practice you should use the uid). Organisation units are organized hierarchically. This means that an organisation unit can have child organization units and so on. The lowest level can be schools (or even classrooms), while higher levels can be administrative units such as clusters, districts or regions.

3. Useful API documentation
 

The DHIS2 documentation has a newly implemented AI assistant. Look for the “Ask AI” button in the bottom right corner.

DHIS2 Documentation

Development videos by topic

Metadata object filters - filtering relevant objects from API endpoints

Metadata field filter - including/excluding relevant properties of objects

dataStore - for storing arbitrary data (should only be used as a last resort)

4. Example API endpoints relevant to the case
Assume that your School Inspector is responsible for Jambalaya Cluster (Jj1IUjjPaWf). The schools are “children” of the cluster node in the orgunit hierarchy/tree.

To list assigned data sets and programs for each school in Jambalaya, nested field filters can be used:

BASE_URL/api/organisationUnits/Jj1IUjjPaWf?fields=name,children[name,id,geometry,dataSets[name,id],programs[name,id]]

The DHIS2 form for school inspection events at AYR Child Learning Center in the Kanifing district in the Gambia can be found at

BASE_URL/dhis-web-capture/index.html#/?orgUnitId=oXTcmBQ3JjJ&programId=UxK2o06ScIe

 



Select any of the reports to see the elements

Screenshot data collection 

*You are free to use the screenshot above for inspiration when developing data collection interfaces for your application. However, we encourage you to think critically and creatively around design, terminology, workflow, etc., while taking the provided School Inspection in Edutopia case description and context carefully into consideration.

To get organisation unit (OU) info - e.g. Banjul District (uid RlPlK44dtoo):

BASE_URL/api/organisationUnits/RlPlK44dtoo

To find the OUs in Albion Cluster (plNY03ITg7K) that have geographical coordinates:

BASE_URL/api/organisationUnits?fields=name,geometry&filter=parent.id:eq:plNY03ITg7K&filter=geometry:!null:all

4.1 Identifying forms and its content
Programs are central to the Tracker and Event models in DHIS2, allowing you to capture individual-level or event-based data, as opposed to aggregate data collected via data sets and data elements

How is a program related to the data structure?

Programs are made up of one or more program stages. Each program stage can have its own set of data elements (the specific data points to be collected).
Programs are assigned to organisation units (the "where" dimension), and data is collected for specific periods (the "when" dimension).
In the data structure, a program acts as a container that organizes data elements (what is collected), program stages (when and how data is collected), and links them to organisation units (where data is collected).
For example, a "Child Health Program" might have stages like "Birth" and "Immunization," each with its own data elements (e.g., birth weight, vaccine type)

List all programs:

BASE_URL/api/programs

Access all properties of one particular program (excluding the list of assigned orgunits - long and not necessarily relevant if orgunit is already identified)

BASE_URL/api/programs/[program_uid]?fields=*,!organisationUnits

List all data sets:

BASE_URL/api/dataSets

Baseline survey data that we will use for reference exists for up to 2022 and can be found in the “EMIS - Primary Tool” data set (uid x0V4c4DxJHE)

Access all properties of one particular data set (excluding the list of assigns orgunits - long and not necessarily relevant if orgunit is already identified)

BASE_URL/api/dataSets/[dataset_uid]?fields=organisationUnits[id,name]

dataSetElements is a list of all data elements in the data set. The field filter can be used to include their name etc in the listing:

BASE_URL/api/dataSets/x0V4c4DxJHE?fields=dataSetElements[dataElement[id,name,domainType,valueType]]

4.2 Events
BASE_URL/api/tracker/events?orgUnit=oXTcmBQ3JjJ&program=UxK2o06ScIe&fields=event,orgUnitName,eventDate,dataValues[dataElement,value]

Note: this is just a sample and not an actual working code. You might need to tweak it for your instance, as some input might require dataset, period, etc.

Sending event

Event payload
{
  "events": 
[{
      "program": "program_uid",
      "programStage": "program_stage_uid",
      "orgUnit": "org_unit_uid",
      "eventDate": "202501",
      "status": "COMPLETED",
      "dataValues": 
[ {

          "dataElement": "data_element_uid",
          "value": "some_value"

            }]
}]
}
 

This can then be POSTed to the api/tracker/events endpoint (or to the older api/events endpoint)

 

4.3 Reading aggregate data values
The number of learners in a given school is broken down by grade level (1-7), gender (M/F), and age groups: < 6,6,7,…….13, >13. Thus, the raw data exist in a matrix format along 3 dimensions (category combos), which can be accessed individually. However, the analytics endpoint can sum up all of these cell values.

So for the lower basic school Campama LBS (Banjul) (IT3x07NwCxd), we can try the following:

BASE_URL/api/analytics.json?dimension=dx:ue3QIMOAC7G&dimension=pe:2022&dimension=ou:IT3x07NwCxd

This results in a long response (mostly metadata), with the final part containing the total value 

    "rows": 
[

        [

            "ue3QIMOAC7G",

            "2022",

            "IT3x07NwCxd",

            "49"

        ]
]

You can also get this from the dataset values:

BASE_URL/api/dataValueSets?dataSet=BfMAe6Itzgt&period=202302&orgUnit=PLq9sJluXvc

Note:  not working code, just as a sample.

Event analysis documentation

