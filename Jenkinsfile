import groovy.transform.Field

@Field def FAIL_STAGE = ""

pipeline {
    agent none

    parameters {
        string(name: 'TAG_APP_TO_DEPLOY', defaultValue: '', description: 'Manual app image tag for rollback (leave empty to use build tag)')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        APP_NAME         = "satelitemonitor"
        REGISTRY         = "harbor.kemenkum.go.id/satelitemonitor-kemenkum"
        STAGE_LOG        = "stage.md"
        SHOULD_DEPLOY_DB = "false"
        VAULT_ADDR       = "https://vault.kemenkum.go.id:8200"
        VAULT_PATH_APP   = "pusdatin-jenkins-satelitemonitor/data/prod/app"
        VAULT_PATH_DB    = "pusdatin-jenkins-satelitemonitor/data/prod/app-db"
        ANSIBLE_DIR      = "ansible"
        // TAG_APP not set at pipeline level — each stage assigns explicitly
    }

    stages {
        stage('Build & Push') {
            agent { label 'AGT-1-149' }

            environment {
                VERSION_APP    = sh(script: "jq -r .version package.json", returnStdout: true).trim()
                COMMIT         = "${env.GIT_COMMIT.take(7)}"
                APP_BRANCH     = sh(script: '''#!/bin/bash
                    if [ -n "$BRANCH_NAME" ]; then echo "$BRANCH_NAME"
                    elif [ -n "$GIT_BRANCH" ]; then echo "$GIT_BRANCH" | sed 's|^origin/||'
                    else git rev-parse --abbrev-ref HEAD || echo "unknown"
                    fi
                ''', returnStdout: true).trim()
                TAG_APP        = "${VERSION_APP}-${COMMIT}-${env.BUILD_NUMBER}"
                COMMIT_AUTHOR  = sh(script: 'git log -1 --pretty=format:"%an"', returnStdout: true).trim()
                COMMIT_MESSAGE = sh(script: 'git log -1 --pretty=format:"%s"', returnStdout: true).trim()
                PROJECT_NAME   = sh(script: 'basename -s .git `git config --get remote.origin.url`', returnStdout: true).trim()
            }

            stages {
                stage('Start Notification') {
                    steps {
                        script {
                            FAIL_STAGE = "Start Notification"
                            sh "echo '=== Stage: Start Notification Started ===' > ${STAGE_LOG}"

                            slackSend(
                                tokenCredentialId: 'slack-token-bot',
                                channel: '#app-satelitemonitor-pipeline',
                                message: "🚀 *${APP_NAME} Pipeline STARTED*\n\n" +
                                    "*Project:* ${env.PROJECT_NAME}\n" +
                                    "*Build:* #${env.BUILD_NUMBER}\n" +
                                    "*Branch:* ${APP_BRANCH}\n" +
                                    "*Commit:* ${env.COMMIT} - ${env.COMMIT_MESSAGE}\n" +
                                    "*Commit by:* ${env.COMMIT_AUTHOR}"
                            )
                            sh "echo '=== Stage: Start Notification Completed ===' >> ${STAGE_LOG}"
                        }
                    }
                }

                stage('Login to Harbor') {
                    steps {
                        script {
                            FAIL_STAGE = "Login to Harbor"
                            sh "echo '=== Stage: Login to Harbor Started ===' > ${STAGE_LOG}"
                        }
                        withCredentials([usernamePassword(
                            credentialsId: 'harbor-credentials',
                            usernameVariable: 'HARBOR_USER',
                            passwordVariable: 'HARBOR_PASS'
                        )]) {
                            sh '''#!/bin/bash
                                        set -eo pipefail
                                        echo $HARBOR_PASS | docker login $REGISTRY -u $HARBOR_USER --password-stdin
                                    '''
                        }
                        sh "echo '=== Stage: Login to Harbor Completed ===' >> ${STAGE_LOG}"
                    }
                }

                stage('Build App Image') {
                    steps {
                        script {
                            FAIL_STAGE = "Build App Image"
                            sh "echo '=== Stage: Build App Image Started ===' > ${STAGE_LOG}"

                            def maxRetries = 3
                            def attempt = 1
                            while (attempt <= maxRetries) {
                                def exitCode = sh(script: '''#!/bin/bash
                                    set -eo pipefail
                                    export TAG_APP=$TAG_APP
                                    export COMPOSE_PROJECT_NAME=satelitemonitor
                                    docker compose -f compose.app.yml build satelitemonitor-app 2>&1 | tee -a "${STAGE_LOG}"
                                ''', returnStatus: true)

                                if (exitCode == 0) { sh "echo '=== Stage: Build App Image Completed ===' >> ${STAGE_LOG}"; sh "docker logout $REGISTRY"; break }

                                def isNetworkError = sh(script: "grep -qiE 'TLS handshake timeout|failed to resolve source metadata|net/http|connection timed out|dial tcp' ${STAGE_LOG} && echo 'true' || echo 'false'", returnStdout: true).trim()
                                if (isNetworkError == 'true' && attempt < maxRetries) { echo "Network error - retrying (${attempt}/${maxRetries})..."; sleep 5; attempt++ }
                                else { error "Build failed" }
                            }
                        }
                    }
                }

                stage('Push App Image') {
                    steps {
                        script {
                            FAIL_STAGE = "Push App Image"
                            sh "echo '=== Stage: Push App Image Started ===' > ${STAGE_LOG}"
                        }
                        withCredentials([usernamePassword(
                            credentialsId: 'harbor-credentials',
                            usernameVariable: 'HARBOR_USER',
                            passwordVariable: 'HARBOR_PASS'
                        )]) {
                            script {
                                def maxRetries = 3
                                def attempt = 1
                                while (attempt <= maxRetries) {
                                    def exitCode = sh(script: '''#!/bin/bash
                                        set -eo pipefail
                                        docker tag $REGISTRY/satelitemonitor-app:$TAG_APP $REGISTRY/satelitemonitor-app:latest
                                        echo $HARBOR_PASS | docker login $REGISTRY -u $HARBOR_USER --password-stdin | tee -a "${STAGE_LOG}"
                                        docker push $REGISTRY/satelitemonitor-app:$TAG_APP 2>&1 | tee -a "${STAGE_LOG}"
                                        docker push $REGISTRY/satelitemonitor-app:latest 2>&1 | tee -a "${STAGE_LOG}"
                                    ''', returnStatus: true)

                                    if (exitCode == 0) { sh "docker logout $REGISTRY"; break }

                                    def isAuthError = sh(script: "grep -qiE 'unauthorized|authentication required|token expired' ${STAGE_LOG} && echo 'true' || echo 'false'", returnStdout: true).trim()
                                    if (isAuthError == 'true' && attempt < maxRetries) { echo "Auth error - retrying (${attempt}/${maxRetries})..."; sleep 5; attempt++ }
                                    else { error "Push failed" }
                                }
                            }
                        }
                        sh "echo '=== Stage: Push App Image Completed ===' >> ${STAGE_LOG}"
                    }
                }

                stage('Remove Old Images') {
                    steps {
                        script {
                            FAIL_STAGE = "Remove Old Images"
                            sh "echo '=== Stage: Remove Old Images Started ===' > ${STAGE_LOG}"
                        }
                        sh 'docker image prune -af'
                        sh "echo '=== Stage: Remove Old Images Completed ===' >> ${STAGE_LOG}"
                    }
                }

                stage('Save Version Tags') {
                    steps {
                        script {
                            sh "echo ${TAG_APP} > image-tag-app.txt"
                            stash includes: 'image-tag-app.txt', name: 'image-tags'
                            sh "echo '=== Version tags saved: ${TAG_APP} ===' >> ${STAGE_LOG}"
                        }
                    }
                }
            }

            post {
                success {
                    slackSend(
                        tokenCredentialId: 'slack-token-bot',
                        channel: '#app-satelitemonitor-pipeline',
                        message: "✅ *${APP_NAME} Build SUCCESS*\n\n" +
                            "*Image App:* ${TAG_APP}\n" +
                            "*Build:* #${env.BUILD_NUMBER}\n" +
                            "*Branch:* ${APP_BRANCH}"
                    )
                    cleanWs()
                }
                failure { script { handleFailure('#app-satelitemonitor-pipeline') } }
            }
        }

        stage('Deploy via Ansible') {
            agent { label 'ANS-1-155' }

            stages {
                stage('Unstash Version Tags') {
                    steps {
                        script {
                            if (params.TAG_APP_TO_DEPLOY) {
                                env.TAG_APP = params.TAG_APP_TO_DEPLOY
                            } else {
                                try {
                                    unstash 'image-tags'
                                    env.TAG_APP = readFile('image-tag-app.txt').trim()
                                } catch (Exception e) {
                                    echo "No build tag found, constructing fallback..."
                                    def versionApp = sh(script: "jq -r .version package.json 2>/dev/null || echo '0.1.0'", returnStdout: true).trim()
                                    def commit = sh(script: 'git rev-parse --short HEAD 2>/dev/null || echo "unknown"', returnStdout: true).trim()
                                    env.TAG_APP = "${versionApp}-${commit}-${env.BUILD_NUMBER}"
                                    echo "Fallback TAG_APP: ${env.TAG_APP}"
                                }
                            }

                            env.COMMIT = sh(script: 'git rev-parse --short HEAD 2>/dev/null || echo "unknown"', returnStdout: true).trim()
                            env.APP_BRANCH = sh(script: '''#!/bin/bash
                                if [ -n "$BRANCH_NAME" ]; then echo "$BRANCH_NAME"
                                elif [ -n "$GIT_BRANCH" ]; then echo "$GIT_BRANCH" | sed 's|^origin/||'
                                else git rev-parse --abbrev-ref HEAD || echo "unknown"
                                fi
                            ''', returnStdout: true).trim()
                            env.COMMIT_AUTHOR = sh(script: 'git log -1 --pretty=format:"%an" 2>/dev/null || echo "unknown"', returnStdout: true).trim()
                            env.COMMIT_MESSAGE = sh(script: 'git log -1 --pretty=format:"%s" 2>/dev/null || echo "unknown"', returnStdout: true).trim()

                            sh "echo '=== Deploying APP: ${env.TAG_APP} ===' > ${STAGE_LOG}"
                        }
                    }
                }

                stage('Start Deploy Notification') {
                    steps {
                        script {
                            FAIL_STAGE = "Start Deploy Notification"
                            sh "echo '=== Stage: Deploy Started ===' > ${STAGE_LOG}"
                        }
                        slackSend(
                            tokenCredentialId: 'slack-token-bot',
                            channel: '#app-satelitemonitor-pipeline',
                            message: "🚀 *${APP_NAME} Deploy STARTED*\n\n" +
                                "*Server:* 172.16.1.143 (via Ansible)\n" +
                                "*Build:* #${env.BUILD_NUMBER}\n" +
                                "*Branch:* ${env.APP_BRANCH}\n" +
                                "*Commit:* ${env.COMMIT} - ${env.COMMIT_MESSAGE}\n" +
                                "*Commit by:* ${env.COMMIT_AUTHOR}"
                        )
                        sh "echo '=== Stage: Deploy Started ===' >> ${STAGE_LOG}"
                    }
                }

                stage('Run Ansible Playbook') {
                    steps {
                        script { FAIL_STAGE = "Run Ansible Playbook" }
                        sh "echo '=== Stage: Ansible Deploy Started ===' > ${STAGE_LOG}"

                        // Install Ansible collections (only if not already installed)
                        sh '''#!/bin/bash
                            set -eo pipefail
                            REQUIRED="community.hashi_vault community.docker community.crypto"
                            INSTALLED=$(ansible-galaxy collection list 2>/dev/null | awk '{print $1}' | sort -u)
                            MISSING=""
                            for col in $REQUIRED; do
                                if ! echo "$INSTALLED" | grep -q "$col"; then
                                    MISSING="$MISSING $col"
                                fi
                            done
                            if [ -n "$MISSING" ]; then
                                echo "Installing missing collections:$MISSING" >> ${STAGE_LOG}
                                ansible-galaxy collection install -r ${ANSIBLE_DIR}/requirements.yml -f 2>&1 | tee -a ${STAGE_LOG}
                            else
                                echo "All required collections already installed" >> ${STAGE_LOG}
                            fi
                        '''

                        withCredentials([
                            usernamePassword(
                                credentialsId: 'harbor-credentials',
                                usernameVariable: 'HARBOR_USER',
                                passwordVariable: 'HARBOR_PASS'
                            ),
                            usernamePassword(
                                credentialsId: 'vault-ssh-satelitemonitor',
                                usernameVariable: 'VAULT_SSH_ROLE_ID',
                                passwordVariable: 'VAULT_SSH_SECRET_ID'
                            ),
                            usernamePassword(
                                credentialsId: 'vault-env-satelitemonitor',
                                usernameVariable: 'VAULT_ENV_ROLE_ID',
                                passwordVariable: 'VAULT_ENV_SECRET_ID'
                            )
                        ]) {
                            sh '''#!/bin/bash
                                set -eo pipefail

                                export WORKSPACE="${WORKSPACE}"
                                export REGISTRY="${REGISTRY}"
                                export HARBOR_USERNAME="${HARBOR_USER}"
                                export HARBOR_PASSWORD="${HARBOR_PASS}"
                                export VAULT_SSH_ROLE_ID="${VAULT_SSH_ROLE_ID}"
                                export VAULT_SSH_SECRET_ID="${VAULT_SSH_SECRET_ID}"
                                export VAULT_ENV_ROLE_ID="${VAULT_ENV_ROLE_ID}"
                                export VAULT_ENV_SECRET_ID="${VAULT_ENV_SECRET_ID}"
                                export TAG_APP="${TAG_APP}"
                                export SHOULD_DEPLOY_DB="${SHOULD_DEPLOY_DB}"
                                export VAULT_ADDR="${VAULT_ADDR}"
                                export VAULT_PATH_APP="${VAULT_PATH_APP}"
                                export VAULT_PATH_DB="${VAULT_PATH_DB}"
                                export ANSIBLE_CONFIG="${WORKSPACE}/${ANSIBLE_DIR}/ansible.cfg"

                                ansible-playbook \
                                    -i ${ANSIBLE_DIR}/inventory/production/hosts \
                                    ${ANSIBLE_DIR}/playbooks/deploy.yml \
                                    -vv \
                                    --diff \
                                    2>&1 | tee -a "${STAGE_LOG}"

                                ANSIBLE_EXIT_CODE=${PIPESTATUS[0]}
                                if [ ${ANSIBLE_EXIT_CODE} -ne 0 ]; then
                                    echo "Ansible playbook failed with exit code ${ANSIBLE_EXIT_CODE}" >> ${STAGE_LOG}
                                    exit ${ANSIBLE_EXIT_CODE}
                                fi
                            '''
                        }
                        sh "echo '=== Stage: Ansible Deploy Completed ===' >> ${STAGE_LOG}"
                    }
                }
            }

            post {
                success {
                    slackSend(
                        tokenCredentialId: 'slack-token-bot',
                        channel: '#app-satelitemonitor-pipeline',
                        message: "✅ *${APP_NAME} Deploy SUCCESS*\n\n" +
                            "*Server:* 172.16.1.143 (via Ansible)\n" +
                            "*Image:* ${TAG_APP}\n" +
                            "*Build:* #${env.BUILD_NUMBER}\n" +
                            "*Branch:* ${env.APP_BRANCH}\n" +
                            "*Commit:* ${env.COMMIT} - ${env.COMMIT_MESSAGE}\n" +
                            "*Commit by:* ${env.COMMIT_AUTHOR}"
                    )
                    cleanWs()
                }
                failure { script { handleFailure('#app-satelitemonitor-pipeline') } }
            }
        }
    }
}

def handleFailure(channel = '#app-satelitemonitor-pipeline') {
    def stageName = FAIL_STAGE ?: 'unknown'
    def namedLog = "stage-${BUILD_NUMBER}-${stageName}.md"
    sh "if [ -f '${STAGE_LOG}' ]; then cp '${STAGE_LOG}' '${namedLog}'; fi"
    archiveArtifacts artifacts: "${namedLog}", fingerprint: true, allowEmptyArchive: true

    slackSend(
        tokenCredentialId: 'slack-token-bot',
        channel: channel,
        message: "❌ *${APP_NAME} Pipeline FAILED*\n\n" +
            "*Stage:* ${stageName}\n" +
            "*Build:* #${env.BUILD_NUMBER}\n" +
            "*Branch:* ${env.APP_BRANCH}\n" +
            "*Commit:* ${env.COMMIT} - ${env.COMMIT_MESSAGE}\n" +
            "*Commit by:* ${env.COMMIT_AUTHOR}"
    )

    try {
        slackUploadFile(
            filePath: "${namedLog}",
            channel: channel,
            initialComment: "Pipeline failed at stage: ${stageName}",
            credentialId: 'slack-token-bot'
        )
    } catch (Exception e) {
        echo "Failed to upload log to Slack: ${e.message}"
    }
    cleanWs()
}
