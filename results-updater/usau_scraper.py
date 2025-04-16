import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
from io import StringIO

def getTournamentPoolPlayResults(tournamentLink):
    result = {}
    with requests.Session() as req:
        result["pools"] = {}
        result["rounds"] = {}

        r = req.get(tournamentLink)
        soup = BeautifulSoup(r.content, 'html.parser')

        roundNames = soup.find_all(id=re.compile("CT_Main_0_rptTabs_ctl.._liTab"))
        index2RoundName = []

        for listItem in roundNames:
            roundName = listItem.find("a").getText()
            result["rounds"][roundName] = {}
            index2RoundName.append(roundName)

        roundResultsDiv = soup.find("div", {"class": "slides"})
        roundResults = roundResultsDiv.find_all("section", {"class": "slide"})

        i = 0
        for roundResult in roundResults:
            if roundResult.get("id") == "poolSlide":
                # ----------------- Add in pool results to pool play -------------------
                pools = roundResult.find_all("div", {"class": "pool"})

                for pool in pools:
                    poolName = pool.find("h3").getText()
                    result["pools"][poolName] = []

                    poolTable = pool.find("table")
                    poolResults = pd.read_html(StringIO(str(poolTable)), na_values=None)

                    for poolResult in poolResults:
                        result["pools"][poolName] = poolResult.to_dict("records")

                # ----------------- Add in non-bracket results -------------------
                sections = roundResult.find_all("table", {"class": "scores_table"})

                for section in sections:
                    sectionName = section.find("th").getText()
                    sectionResults = pd.read_html(StringIO(str(section)), header=0, na_values=None)

                    for sectionResult in sectionResults:
                        sectionResult.columns = sectionResult.iloc[0]
                        sectionResult = sectionResult[1:]
                        sectionResult = sectionResult.drop("Options", axis=1)
                        result["rounds"][index2RoundName[i]][sectionName] = sectionResult.to_dict(
                            "records"
                        )

            if result["rounds"][index2RoundName[i]] == {}:
                del result["rounds"][index2RoundName[i]]

            i += 1

        return result

def getTournamentBracketResults(tournamentLink):
    result = {}
    with requests.Session() as req:
        r = req.get(tournamentLink)
        soup = BeautifulSoup(r.content, 'html.parser')

        roundResults = soup.find("div", {"class": "slides"}).find_all("section", {"class": "slide"})
        for roundResult in roundResults:
            if roundResult.get("id") == "bracketSlide":
                # -------------- Add in bracket results --------------------
                sections = roundResult.find_all("section", {"class": "section page"})

                for section in sections:
                    sectionName = section.find("h3").getText().strip()
                    result[sectionName] = {}

                    rounds = section.find_all("div", {"class": "bracket_col"})

                    for r in rounds:
                        roundName = r.find("h4").getText()
                        result[sectionName][roundName] = []

                        games = r.find_all("div", {"class": "bracket_game"})

                        for game in games:
                            status = game.find("span", {"class": "game-status"}).getText()

                            if status == "Final":
                                date, time, am_pm = game.find("span", {"class": "date"}).getText().split(" ")
                                time = time + am_pm
                                field = game.find("p", {"class": "location"}).getText()
                                winnerDiv = game.find("div", {"class": "winner"})
                                loserDiv = game.find("div", {"class": "loser"})
                                winner = winnerDiv.find("span", {"class": "isName"}).find("a").getText()
                                loser = loserDiv.find("span", {"class": "isName"}).find("a").getText()
                                scoreW = winnerDiv.find("span", {"class": "isScore"}).getText().strip()
                                scoreL = loserDiv.find("span", {"class": "isScore"}).getText().strip()
                                score = scoreW + " - " + scoreL

                                gameDict = {
                                    "date": date,
                                    "time": time,
                                    "field": field,
                                    "winner": winner,
                                    "loser": loser,
                                    "score": score,
                                    "status": status,
                                }

                                result[sectionName][roundName].append(gameDict)

        return result

def getTournamentResults(tournamentLink):
    return {
        "pool_play": getTournamentPoolPlayResults(tournamentLink),
        "bracket": getTournamentBracketResults(tournamentLink)
    }

print(getTournamentResults("https://play.usaultimate.org/events/2024-USA-Ultimate-D-1-College-Championships/schedule/Men/CollegeMen/"))