'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { store } from '@/lib/store'
import type { ScoreboardEntry } from '@/lib/types'
import { ArrowLeft, Trophy, Target, BarChart3, Medal } from 'lucide-react'

export default function ScoreboardPage() {
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([])
  const [currentPlayerAlias, setCurrentPlayerAlias] = useState<string | null>(null)

  useEffect(() => {
    setScoreboard(store.getScoreboard())
    setCurrentPlayerAlias(localStorage.getItem('quiz_alias'))

    const unsubscribe = store.subscribe(() => {
      setScoreboard(store.getScoreboard())
    })

    return () => unsubscribe()
  }, [])

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500'
      case 2:
        return 'text-gray-400'
      case 3:
        return 'text-amber-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30'
      case 2:
        return 'bg-gray-400/10 border-gray-400/30'
      case 3:
        return 'bg-amber-600/10 border-amber-600/30'
      default:
        return 'bg-secondary/50 border-border/50'
    }
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" />
            <span>Global Rankings</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Scoreboard</h1>
          <p className="text-muted-foreground">
            Rankings based on accuracy across all quiz sessions
          </p>
        </div>

        {scoreboard.length === 0 ? (
          <Card className="border-border/50 text-center">
            <CardContent className="py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Rankings Yet</h3>
              <p className="text-muted-foreground mb-6">
                Play a quiz to appear on the scoreboard!
              </p>
              <Link href="/">
                <Button>Start a Quiz</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium */}
            {scoreboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* 2nd Place */}
                <div className="flex flex-col items-center pt-8">
                  <Card className={`w-full border ${getRankBg(2)}`}>
                    <CardContent className="py-6 text-center">
                      <Medal className={`w-8 h-8 mx-auto mb-2 ${getMedalColor(2)}`} />
                      <p className="font-bold text-foreground truncate">{scoreboard[1].alias}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {scoreboard[1].accuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scoreboard[1].totalCorrectAnswers}/{scoreboard[1].totalQuestionsAnswered}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center">
                  <Card className={`w-full border ${getRankBg(1)}`}>
                    <CardContent className="py-8 text-center">
                      <Medal className={`w-10 h-10 mx-auto mb-2 ${getMedalColor(1)}`} />
                      <p className="font-bold text-foreground truncate">{scoreboard[0].alias}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {scoreboard[0].accuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scoreboard[0].totalCorrectAnswers}/{scoreboard[0].totalQuestionsAnswered}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center pt-12">
                  <Card className={`w-full border ${getRankBg(3)}`}>
                    <CardContent className="py-5 text-center">
                      <Medal className={`w-7 h-7 mx-auto mb-2 ${getMedalColor(3)}`} />
                      <p className="font-bold text-foreground truncate">{scoreboard[2].alias}</p>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {scoreboard[2].accuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scoreboard[2].totalCorrectAnswers}/{scoreboard[2].totalQuestionsAnswered}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Full Leaderboard */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Full Leaderboard
                </CardTitle>
                <CardDescription>
                  All players ranked by accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b border-border/50">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">Player</div>
                  <div className="col-span-2 text-center">Answered</div>
                  <div className="col-span-2 text-center">Correct</div>
                  <div className="col-span-2 text-right">Accuracy</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border/30">
                  {scoreboard.map((entry) => {
                    const isCurrentPlayer = entry.alias === currentPlayerAlias
                    return (
                      <div
                        key={entry.alias}
                        className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${
                          isCurrentPlayer ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="col-span-1">
                          {entry.rank <= 3 ? (
                            <Medal className={`w-5 h-5 ${getMedalColor(entry.rank)}`} />
                          ) : (
                            <span className="text-muted-foreground font-medium">
                              {entry.rank}
                            </span>
                          )}
                        </div>
                        <div className="col-span-5 font-medium text-foreground flex items-center gap-2">
                          {entry.alias}
                          {isCurrentPlayer && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                              You
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 text-center text-muted-foreground">
                          {entry.totalQuestionsAnswered}
                        </div>
                        <div className="col-span-2 text-center text-foreground font-medium">
                          {entry.totalCorrectAnswers}
                        </div>
                        <div className="col-span-2 text-right">
                          <span
                            className={`font-bold ${
                              entry.accuracy >= 80
                                ? 'text-success'
                                : entry.accuracy >= 60
                                  ? 'text-accent'
                                  : 'text-foreground'
                            }`}
                          >
                            {entry.accuracy.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stats Info */}
            <div className="mt-6 flex justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>{scoreboard.length} players ranked</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Min 1 question to rank</span>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
