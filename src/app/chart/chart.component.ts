import { Component, OnInit, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { backgroundImagePlugin } from '../plugins/backgroundImagePlugin';

declare const scatterData: any[];

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css'],
  standalone: true,
  imports: [BaseChartDirective, CommonModule, FormsModule]
})
export class ChartComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public scatterChartOptions: ChartConfiguration['options'] = {
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        display: false,
        suggestedMin: -60, // Suggested minimum
        suggestedMax: 60
      },
      y: {
        display: false,
        suggestedMin: -30, // Suggested minimum
        suggestedMax: 30
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    },
    animation: {
      duration: 0
    }
  };

  public scatterChartData: ChartData<'scatter'> = {
    datasets: []
  };

  public scatterChartType: ChartType = 'scatter';

  public uniqueTrackers: number[] = [];
  public selectedTrackers: Set<number> = new Set<number>();
  public availableLaps: { [key: number]: number[] } = {};
  public selectedLaps: { [key: number]: Set<number> } = {};

  public minTime: Date = new Date(); // Minimum time for the selected laps
  public maxTime: Date = new Date(); // Maximum time for the selected laps

  public selectedTimeIndex: number = 0;
  public maxTimeIndex: number = 0;
  public startTime: string = '0.000s'; // Start time in seconds
  public endTime: string = '0.000s';   // End time in seconds
  public currentTime: string = '0.000s';

  public isLapSelected: boolean = false;  // Track if any lap is selected

  private allData = scatterData;  // Full data for highlighting and path visualization
  private filteredData: { [trackerId: number]: any[] } = {}; // Stores data for each selected tracker

  public trackerData: { [trackerId: number]: { speed: number, s: number, d: number, isActive: boolean } } = {};

  // Define colors for points
  private pointColors: string[] = ['red', 'orange', 'cyan', 'purple', 'yellow', 'pink', 'lightgreen', 'black', 'gray', 'green', 'gold', 'blue'];

  ngOnInit() {
    this.uniqueTrackers = [...new Set(this.allData.map(item => item.tracker_id))];
    this.uniqueTrackers.forEach(trackerId => {
      this.availableLaps[trackerId] = [...new Set(
        this.allData
          .filter(item => item.tracker_id === trackerId)
          .map(item => item.lap)
      )];
      this.selectedLaps[trackerId] = new Set<number>();
    });
    // Register the plugin globally
    Chart.register(backgroundImagePlugin);

    this.updateChart();
  }

  moveSliderToTime(timeInMs: number): void {
    this.selectedTimeIndex = timeInMs - this.minTime.getTime();
    this.onTimeChange({ target: { value: this.selectedTimeIndex } });
  }

  onTimeChange(event: any): void {
    const selectedTimeInMs = this.minTime.getTime() + +event.target.value;
    this.selectedTimeIndex = selectedTimeInMs - this.minTime.getTime();
    this.updateCurrentTimeDisplay();
    this.updateHighlightedPoints();
  }

  onTrackerToggle(trackerId: number, event: any) {
    const wasEmpty = this.selectedTrackers.size === 0;
    if (event.target.checked) {
        this.selectedTrackers.add(trackerId);
        // Automatically check the first lap with index 1, if available
        const availableLaps = this.availableLaps[trackerId];
        const firstLapIndex = availableLaps.indexOf(1); // Find the lap with index 1
        if (firstLapIndex !== -1) {
            this.selectedLaps[trackerId].add(availableLaps[firstLapIndex]);
        }
        if (wasEmpty) {
            // If this was the first rider selected, set the current time to the minimum start time
            this.updateMinMaxTime();
            this.selectedTimeIndex = 0; // Set thumb to the start of the time range
            this.onTimeChange({ target: { value: this.selectedTimeIndex } });
        }
    } else {
        this.selectedTrackers.delete(trackerId);
        this.selectedLaps[trackerId].clear();
    }
    this.updateMinMaxTime(); // Update min/max time when the rider or laps are selected/deselected
    this.updateChart(); // Update the chart with the selected rider and automatically selected lap
}

onLapToggle(trackerId: number, lap: number, event: any) {
  if (lap === -1) {  // "All Laps" option
      if (event.target.checked) {
          this.availableLaps[trackerId].forEach(lap => this.selectedLaps[trackerId].add(lap));
      } else {
          this.selectedLaps[trackerId].clear();
      }
  } else {
      if (event.target.checked) {
          this.selectedLaps[trackerId].add(lap);
      } else {
          this.selectedLaps[trackerId].delete(lap);
      }
  }
  // Check if all laps are selected and update the "All Laps" checkbox accordingly
  const allLapsSelected = this.availableLaps[trackerId].every(lap => this.selectedLaps[trackerId].has(lap));
  const allLapsCheckbox = document.getElementById(`all-laps-${trackerId}`) as HTMLInputElement;
  if (allLapsSelected) {
      allLapsCheckbox.checked = true;
  } else {
      allLapsCheckbox.checked = false;
  }
  this.updateMinMaxTime(); 
  this.updateChart();
  // Do not change current time if additional riders or laps are selected
  if (this.selectedTrackers.size === 1 && this.selectedLaps[trackerId].size === 1) {
      this.onTimeChange({ target: { value: this.selectedTimeIndex } }); // Keep the thumb at the current time
  }
}

  private updateMinMaxTime() {
    let minTime = Infinity;
    let maxTime = -Infinity;

    this.selectedTrackers.forEach(trackerId => {
        this.selectedLaps[trackerId].forEach(lap => {
            const lapData = this.allData.filter(item => item.tracker_id === trackerId && item.lap === lap);
            if (lapData.length > 0) {
                const startTime = new Date(lapData[0].time).getTime();
                const endTime = new Date(lapData[lapData.length - 1].time).getTime();

                if (startTime < minTime) minTime = startTime;
                if (endTime > maxTime) maxTime = endTime;
            }
        });
    });
    this.minTime = new Date(minTime);
    this.maxTime = new Date(maxTime);
    this.startTime = this.formatTime(this.minTime); // Update startTime to display real time
    this.endTime = this.formatTime(this.maxTime);   // Update endTime to display real time
    this.maxTimeIndex = maxTime - minTime;          // Adjust maxTimeIndex to reflect the range
  }

  private updateChart() {
    const datasets: ChartData<'scatter'>['datasets'] = [];
    let maxTime = 0; // Initialize maximum time

    this.selectedTrackers.forEach((trackerId, index) => {
        this.selectedLaps[trackerId].forEach(lap => {
            this.filteredData[trackerId] = this.allData.filter(item =>
                item.tracker_id === trackerId && item.lap === lap);

            if (this.filteredData[trackerId].length > 0) {
                // Create path with every 12th point
                const pathData = this.filteredData[trackerId].filter((_, idx) => idx % 12 === 0).map(item => ({ x: item.x, y: item.y }));

                datasets.push({
                    label: `Tracker ${trackerId} - Lap ${lap}`,
                    data: pathData,
                    backgroundColor: this.getColorForTracker(trackerId),
                    pointRadius: 2.5,
                });
                // Update maxTime with the actual time instead of seconds
                const trackerMaxTime = new Date(this.filteredData[trackerId][this.filteredData[trackerId].length - 1].time).getTime();
                if (trackerMaxTime > maxTime) {
                    maxTime = trackerMaxTime;
                }
            }
        });
    });
    this.scatterChartData = {
        datasets: datasets
    };
    // Adjust maxTimeIndex based on the minTime and maxTime difference
    this.maxTimeIndex = maxTime - this.minTime.getTime(); 
    this.endTime = this.formatTime(new Date(maxTime)); // Display the max time as the slider's end time

    this.updateCurrentTimeDisplay();
    this.updateHighlightedPoints();
    this.chart?.update(); // Ensure the chart is updated to reflect changes
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  private updateCurrentTimeDisplay() {
    const currentTime = new Date(this.minTime.getTime() + this.selectedTimeIndex);
    this.currentTime = this.formatTime(currentTime);
  } 

  private getClosestIndexForTime(data: any[], timeInMs: number): number {
    // Given a time in milliseconds, find the closest data point index
    for (let i = 0; i < data.length; i++) {
      const pointTime = new Date(data[i].time).getTime() - new Date(data[0].time).getTime();
      if (pointTime >= timeInMs) {
        return i;
      }
    }
    return data.length - 1; // Return the last index if time exceeds data
  }

  private updateHighlightedPoints() {
    const highlightedPoints: ChartData<'scatter'>['datasets'] = [];

    this.selectedTrackers.forEach((trackerId, index) => {
        let combinedData: any[] = [];
        // Apvieno datus no visiem izvēlētajiem apļiem
        this.selectedLaps[trackerId].forEach(lap => {
            const lapData = this.allData.filter(item => item.tracker_id === trackerId && item.lap === lap);
            combinedData = combinedData.concat(lapData);
        });
        combinedData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()); // Kārto apvienoto datu sarakstu pēc laika

        const trackerMinTime = new Date(combinedData[0].time).getTime(); // Atrodam šī braucēja minimālo un maksimālo laiku starp visiem izvēlētajiem apļiem
        const trackerMaxTime = new Date(combinedData[combinedData.length - 1].time).getTime();
  
        const relativeTimeInMs = this.selectedTimeIndex + this.minTime.getTime() - trackerMinTime; // Aprēķina relatīvo laiku

        if (relativeTimeInMs >= 0 && relativeTimeInMs <= (trackerMaxTime - trackerMinTime)) {  
            // Braucējs ir aktīvs
            const closestIndex = this.getClosestIndexForTime(combinedData, relativeTimeInMs);
            const dataAtTime = combinedData[closestIndex];
            if (dataAtTime) {
                this.trackerData[trackerId] = {
                    speed: dataAtTime.real_speed * 3.6, // Convert speed to km/h
                    s: dataAtTime.s,
                    d: dataAtTime.d,
                    isActive: true
                };

                highlightedPoints.push({
                    label: `Current Position - Tracker ${trackerId}`,
                    data: [{ x: dataAtTime.x, y: dataAtTime.y }],
                    backgroundColor: this.getColorForTracker(trackerId),
                    pointRadius: 10,
                    showLine: false
                });
            }
        } else {
            // Braucējs nav aktīvs (vai nu vēl nav sācis, vai jau beidzis kustību)
            this.trackerData[trackerId] = {
                speed: 0,
                s: 0,
                d: 0,
                isActive: false
            };
        }
    });
    this.scatterChartData = {
        datasets: [
            ...this.scatterChartData.datasets.filter(dataset => !dataset.label?.startsWith('Current Position')),
            ...highlightedPoints
        ]
    };

    this.chart?.update();
  }

  // Method to get the color for the tracker based on the selectedTrackers and trackerId
  public getColorForTracker(trackerId: number): string {
    const trackerArray = Array.from(this.selectedTrackers);
    const trackerIndex = trackerArray.indexOf(trackerId);
    return this.pointColors[trackerIndex % this.pointColors.length]; // Ensure that each tracker gets a unique color
  }

  isTrackerSelected(trackerId: number): boolean {
    return this.selectedTrackers.has(trackerId);
  }

  getLapStartEnd(trackerId: number): Array<{ label: string, time: number }> {
    const laps = Array.from(this.selectedLaps[trackerId]);
    const startEndData: Array<{ label: string, time: number }> = [];

    laps.sort((a, b) => a - b); // Pārliecināmies, ka apļi ir sakārtoti secībā

    laps.forEach((lap, index) => {
        const lapData = this.allData.filter(item => item.tracker_id === trackerId && item.lap === lap);
        if (lapData.length > 0) {
            // Pievieno apļa sākuma laiku
            startEndData.push({
                label: `s${lap}`, // Apļa sākums
                time: new Date(lapData[0].time).getTime()
            });
            // Pievieno apļa beigu laiku, ja šim aplim neseko nākamais aplis pēc kārtas vai tas ir pēdējais aplis
            const nextLap = laps[index + 1];
            if (nextLap !== lap + 1 || index === laps.length - 1) {
                startEndData.push({
                    label: `e${lap}`, // Apļa beigas
                    time: new Date(lapData[lapData.length - 1].time).getTime()
                });
            }
        }
    });
    return startEndData;
  }

  getLapIndicatorPosition(timeInMs: number): string {
    // Aprēķina procentuālo vērtību slidera diapazonā, pamatojoties uz globālo laika diapazonu (minTime to maxTime)
    const percentage = ((timeInMs - this.minTime.getTime()) / (this.maxTime.getTime() - this.minTime.getTime())) * 100;
    return `${percentage}%`;
  }

  getIndicatorOffset(lapTime: number, trackerId: number): number {
    const lapIndicators: number[] = []; // Explicitly typing the array as number[]
    // Gather all indicators at the same time position
    this.selectedTrackers.forEach(id => {
        const laps = this.getLapStartEnd(id);
        laps.forEach(lap => {
            if (lap.time === lapTime) {
                lapIndicators.push(id);
            }
        });
    });
    // Find the index of the current trackerId in the gathered indicators
    const index = lapIndicators.indexOf(trackerId);
    return index * 24; // Adjust 24px offset per overlapping indicator
  }
}