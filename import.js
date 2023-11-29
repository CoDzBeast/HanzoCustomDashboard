$(document).ready(function() {
    document.getElementById('importButton').addEventListener('click', function() {
        const fileInput = document.getElementById('fileInput');
        const files = fileInput.files;
        const comparisonContent = document.getElementById('comparisonContent');

        if (files.length === 0) {
            alert("Please select files to import.");
            return;
        }

        comparisonContent.innerHTML = ''; // Clear previous data

        let averages = {};
        let totalSharps = {};
        let totalBreaks = {};

        // New metrics
        let breakDurations = {}; // { name: totalBreakDuration }
        let longestBreaks = {}; // { name: longestBreak }
        let hourlyProductivity = {}; // { hour: { name: totalQuantity } }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            reader.onload = function(event) {
                const data = JSON.parse(event.target.result);

                for (const name in data) {
                    const personData = data[name];
                    averages[name] = (averages[name] || 0) + personData.averagePerHour;
                    totalSharps[name] = (totalSharps[name] || 0) + personData.totalQuantity;
                    totalBreaks[name] = (totalBreaks[name] || 0) + personData.gaps.length;

                    // Calculate break metrics
                    breakDurations[name] = 0;
                    longestBreaks[name] = 0;
                    for (const gap of personData.gaps) {
                        const breakDuration = new Date(gap.end) - new Date(gap.start);
                        breakDurations[name] += breakDuration;
                        longestBreaks[name] = Math.max(longestBreaks[name], breakDuration);
                    }

                    // Calculate hourly productivity (assuming totalQuantity is accumulated hourly)
                    const hour = new Date(personData.firstCheckIn).getHours();
                    if (!hourlyProductivity[hour]) hourlyProductivity[hour] = {};
                    hourlyProductivity[hour][name] = (hourlyProductivity[hour][name] || 0) + personData.totalQuantity;
                }

                displayData(data);
            };

            reader.readAsText(file);
        }

        function displayData(data) {
            const table = document.createElement('table');
            table.className = 'table table-bordered mt-4';
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th style="color: #ffffff;">Name</th>
                    <th style="color: #ffffff;">Average Per Hour</th>
                    <th style="color: #ffffff;">Total Quantity</th>
                    <th style="color: #ffffff;">Breaks</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            for (const name in data) {
                const personData = data[name];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color: #ffffff;">${name}</td>
                    <td style="color: #ffffff;">${personData.averagePerHour.toFixed(2)}</td>
                    <td style="color: #ffffff;">${personData.totalQuantity}</td>
                    <td style="color: #ffffff;">${personData.gaps.length}</td>
                `;
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            
            comparisonContent.appendChild(table);

            // Convert break metrics to minutes
            const averageBreakDurations = {};
            for (const name in breakDurations) {
                averageBreakDurations[name] = (breakDurations[name] / totalBreaks[name]) / (1000 * 60); // Convert to minutes
            }
            const longestBreakInMinutes = {};
            for (const name in longestBreaks) {
                longestBreakInMinutes[name] = longestBreaks[name] / (1000 * 60); // Convert to minutes
            }

            // Find most and least productive hours
            const mostProductiveHour = Object.keys(hourlyProductivity).reduce((a, b) => {
                const totalA = Object.values(hourlyProductivity[a]).reduce((sum, val) => sum + val, 0);
                const totalB = Object.values(hourlyProductivity[b]).reduce((sum, val) => sum + val, 0);
                return totalA > totalB ? a : b;
            });
            const leastProductiveHour = Object.keys(hourlyProductivity).reduce((a, b) => {
                const totalA = Object.values(hourlyProductivity[a]).reduce((sum, val) => sum + val, 0);
                const totalB = Object.values(hourlyProductivity[b]).reduce((sum, val) => sum + val, 0);
                return totalA < totalB ? a : b;
            });

            // Find names associated with the new metrics
            const nameWithLongestBreak = Object.keys(longestBreakInMinutes).reduce((a, b) => longestBreakInMinutes[a] > longestBreakInMinutes[b] ? a : b);
            const nameWithHighestAverageBreak = Object.keys(averageBreakDurations).reduce((a, b) => averageBreakDurations[a] > averageBreakDurations[b] ? a : b);

            // Display new metrics
            const breakMetricsDiv = document.createElement('div');
            breakMetricsDiv.innerHTML = `
                <div class="row mt-4">
                    <div class="col-md-4">
                        <div class="card text-white bg-info mb-3" style="max-width: 18rem;">
                            <div class="card-header"><i class="fas fa-clock"></i> Longest Break</div>
                            <div class="card-body">
                                <h5 class="card-title">${nameWithLongestBreak}</h5>
                                <p class="card-text">Duration: ${longestBreakInMinutes[nameWithLongestBreak].toFixed(2)} minutes</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-white bg-warning mb-3" style="max-width: 18rem;">
                            <div class="card-header"><i class="fas fa-hourglass-half"></i> Average Break Duration</div>
                            <div class="card-body">
                                <h5 class="card-title">${nameWithHighestAverageBreak}</h5>
                                <p class="card-text">Average: ${averageBreakDurations[nameWithHighestAverageBreak].toFixed(2)} minutes</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-white bg-dark mb-3" style="max-width: 18rem;">
                            <div class="card-header"><i class="fas fa-sun"></i> Most Productive Hour</div>
                            <div class="card-body">
                                <h5 class="card-title">${mostProductiveHour}:00 - ${parseInt(mostProductiveHour) + 1}:00</h5>
                                <p class="card-text">Hour: ${mostProductiveHour}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            comparisonContent.appendChild(breakMetricsDiv);
        }

        // Display metrics after processing all files
        setTimeout(function() {
            const highestAverageName = Object.keys(averages).reduce((a, b) => averages[a] > averages[b] ? a : b);
            const mostSharpsName = Object.keys(totalSharps).reduce((a, b) => totalSharps[a] > totalSharps[b] ? a : b);
            const mostBreaksName = Object.keys(totalBreaks).reduce((a, b) => totalBreaks[a] > totalBreaks[b] ? a : b);

            const metricsDiv = document.createElement('div');
            metricsDiv.innerHTML = `
                <div class="row">
                    <div class="col-md-4">
                        <div class="card text-white bg-primary mb-3" style="max-width: 18rem;">
                            <div class="card-header"><i class="fas fa-chart-line"></i> Highest Overall Average</div>
                            <div class="card-body">
                                <h5 class="card-title">${highestAverageName}</h5>
                                <p class="card-text">Average: ${(averages[highestAverageName] / files.length).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-white bg-success mb-3" style="max-width: 18rem;">
                            <div class="card-header"><i class="fas fa-check-circle"></i> Most Sharps</div>
                            <div class="card-body">
                                <h5 class="card-title">${mostSharpsName}</h5>
                                <p class="card-text">Sharps: ${totalSharps[mostSharpsName]}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-white bg-danger mb-3" style="max-width: 18rem;">
                            <div class="card-header"><i class="fas fa-coffee"></i> Most Breaks</div>
                            <div class="card-body">
                                <h5 class="card-title">${mostBreaksName}</h5>
                                <p class="card-text">Breaks: ${totalBreaks[mostBreaksName]}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            comparisonContent.appendChild(metricsDiv);
        }, 500);

        // Show the modal
        $('#comparisonModal').modal('show');
    });
});
