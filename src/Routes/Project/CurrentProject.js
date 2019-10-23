import React, { useEffect, useState } from "react";
/*import {
  useDataPoints,
  useSensorNames,
  useProjectName,
  useSensorData
} from "../../stores/sensors/sensorsStore";*/
import {
  useProjectName,
  useSensorNames
} from "../../stores/sensors/sensorsStore";
import { storage } from "../../firebase";
import MySocket from "../../Components/Livestream/MySocket";

import * as tf from "@tensorflow/tfjs";
import { csv } from "d3";
import "./CurrentProject.css";
/*import {
  setDatapoints,
  setSensors,
  setProjectName,
  setSensorData
} from "../../stores/sensors/sensorsActions";*/
import Sensor from "../../Components/Sensor/Sensor";
import SingleSensor from "../../Components/Sensor/SingleSensor";
import { Redirect } from "react-router-dom";

import {
  getR2Score,
  normalizeData,
  standardizeData,
  getCovarianceMatrix,
  getDatasetByColumns,
  discardCovariantColumns,
  shuffleData
} from "./statisticsLib.js";

import { setConfig, setData, uploadData, uploadConfig } from "./transferLib.js";
import { getFeatureTargetSplit, getTestTrainSplit, convertToTensors, getBasicModel, getComplexModel } from "./machineLearningLib.js";

let model;
let dataPoints;
let sensors = [];
let sensorData;

function setDataPoints(p) {
  dataPoints = p;
}

function setSensors(s) {
  sensors = s
}

function setSensorData(d) {
  sensorData = d
}

async function setModel(project) {
  model = await tf.loadLayersModel(
    "indexeddb://" + project + "/model"
  );
}

const CurrentProject = ({ match }) => {
  //const dataPoints = useDataPoints();
  const sensorNames = useSensorNames();
  //const sensorData = useSensorData();
  // PROJECTNAME const p = useSensorNames();
  const { projectName } = match.params;
  const [currentSensor, setCurrentSensor] = useState(sensorNames[0]);

  const [loading, setLoading] = useState(false);

  const lastLoadedProjectName = useProjectName();
  
  let plot_y = []
  let plot_pred = []

  function predict(dataPoint) {
    if (sensorData.hasDifferentValueRanges) {
      dataPoint = standardizeData(dataPoint);
    } else {
      dataPoint = normalizeData(dataPoint);
    }
    
    const prediction = model.predict(tf.tensor2d([dataPoint], [1, dataPoint.length])).dataSync()
    if (prediction.length === 1) {
      return prediction[0];
    } else {
      return prediction;
    }

  }

  function doPredictions(model) {
    let predName = sensorData.output[0];
    console.log(model);
    let dataCopy = JSON.parse(JSON.stringify(dataPoints));
    let y_real = dataPoints.map(x => Number(x[predName]));
    dataCopy.forEach(x => delete x[predName]);
    let x_real = dataCopy.map(x => Object.values(x).map(y => Number(y)));
    console.log("y_real", y_real);
    console.log("x_real", x_real);
    if (sensorData.hasDifferentValueRanges) {
      x_real = standardizeData(x_real);
    } else {
      x_real = normalizeData(x_real);
    }

    let i = 0;
    x_real.forEach(p => {
      let prediction = model.predict(tf.tensor2d([p], [1, p.length])).dataSync();
      console.log("pred", prediction);
      console.log("real", y_real[i]);
      plot_y.push(y_real[i]);
      plot_pred.push(prediction[0]);
      i = i + 1;
    });

    console.log(plot_y)
    console.log(plot_pred)
  }

  useEffect(async () => {
    console.log("LAST LOADED", projectName);
    setLoading(true);

    await setConfig(projectName, setSensorData);
    await setData(projectName, setDataPoints, setSensors)
    console.log("dataPoints", dataPoints)
    console.log("sensorData", sensorData)
    console.log("sensors", sensors)
    await setModel(projectName);
    setLoading(false)
    doPredictions(model)
  }, []);

  return (
    <div className="Container">
      <div className="CurrentProject__Title">
        Project: {lastLoadedProjectName}
      </div>
      {loading && <div>Loading data...</div>}
      {projectName === undefined && lastLoadedProjectName.length === 0 && (
        <div>You currently have no current project selected. </div>
      )}
      {!loading && (
        <div>
          <div className="Setup__Option">
            Your sensors (choose one if you have not selected any):
          </div>
          <div className="CurrentProject__SensorsList">
            {sensors.map(sensor => (
              <div
                className={currentSensor === sensor ? "SelectedSensor" : ""}
                onClick={() => {
                  setCurrentSensor(sensor);
                }}
                key={sensor}
              >
                {sensor}
              </div>
            ))}
          </div>
          {currentSensor && (
            <div>
              <Sensor
                sensor={currentSensor}
                dataPoints={dataPoints}
                sensors={sensors}
              />
            </div>
          )}
          <div>
            <SingleSensor
              sensor={currentSensor}
              dataPoints={plot_y}
              sensors={sensors}
            />
          </div>
          <div>
            <SingleSensor
              sensor={currentSensor}
              dataPoints={plot_pred}
              sensors={sensors}
            />
          </div>
        </div>
      )}
      {!loading && (
        <div>
          <MySocket />
        </div>
      )}
    </div>
  );
};

export default CurrentProject;
