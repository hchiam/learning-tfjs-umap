const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs");
const use = require("@tensorflow-models/universal-sentence-encoder");
import { UMAP } from "umap-js";
import * as $ from "jquery";
import Chart from "chart.js/auto"; // https://stackoverflow.com/a/67143648

let chart;

$("#start").on("click", () => {
  const sentences = $("#inputs")
    .val()
    .split("\n")
    .filter((x) => x);
  if (sentences?.length) {
    $("#start").prop("disabled", true);
    runAnalysis(sentences, () => {
      $("#start").prop("disabled", false);
    });
  }
});

async function runAnalysis(sentences, callback) {
  if (chart) chart.destroy();

  $("#chart").addClass("in-progress");
  $("#status").css("color", "red");

  showStatus("Creating model...");
  const model = await use.load();

  showStatus("Creating embeddings...");
  const embeddings = await model.embed(sentences);
  const sentenceEmbeddingsAsArray = [];
  sentences.forEach((sentence, i) => {
    const sentenceEmbedding = tf.slice(embeddings, [i, 0], [1]);
    const sentenceEmbeddingAsArray = sentenceEmbedding.dataSync();
    sentenceEmbeddingsAsArray.push(sentenceEmbeddingAsArray);
  });

  showStatus("Creating plottable data with UMAP...");
  const dimensions = 2; // 2 = 2D
  const numberOfNeighbours = 3; // Math.min(15, Math.max(3, Math.ceil(sentenceEmbeddingsAsArray.length / 2)));
  console.log("numberOfNeighbours", numberOfNeighbours);
  const umap = new UMAP({
    //nEpochs: 100, // nEpochs is computed automatically by default
    nComponents: dimensions,
    nNeighbors: numberOfNeighbours,
    minDist: 0.1, // default: 0.1
    spread: 1.0, // default: 1.0
    // other parameters: https://github.com/PAIR-code/umap-js/#parameters
  });
  const plottableData = umap.fit(sentenceEmbeddingsAsArray);

  showStatus("Plotting data...");
  chart = plot(plottableData, sentences, () => {
    $("#chart").removeClass("in-progress");
    $("#status").css("color", "green");

    showStatus(
      "Visualization ready! Hover over points to read comments. The model tries to group semantically similar comments near each other."
    );

    if (callback) callback();
  });
}

function showStatus(message) {
  $("#status").text(message);
  console.log(message);
}

function plot(coordinatesArray, labels, callback) {
  const data = coordinatesArray.map((x) => {
    return { x: x[0], y: x[1] };
  });

  console.log("labels", labels);
  console.log("data", data);

  const chart = new Chart("chart", {
    type: "scatter",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          pointBackgroundColor: "black",
          pointRadius: 7,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: false,
        },
      },
      responsive: true,
    },
  });

  if (callback) callback();

  return chart;
}
